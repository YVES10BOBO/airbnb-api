import { Request, Response, NextFunction } from "express";
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { model, deterministicModel } from "../config/ai";
import { getCache, setCache } from "../config/cache";
import { Prisma } from "../generated/prisma/client";

const sessions = new Map<string, BaseMessage[]>();

function extractJSON(text: string): unknown {
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("No valid JSON found in response");
  }
}

function handleGroqError(error: unknown, res: Response): boolean {
  const err = error as any;
  const status = err?.status ?? err?.statusCode ?? 0;
  const msg: string = err?.message ?? "";
  if (status === 429 || msg.includes("429") || msg.toLowerCase().includes("rate limit")) {
    res.status(429).json({ error: "AI service is busy, please try again in a moment" });
    return true;
  }
  if (status === 401 || msg.includes("401") || msg.toLowerCase().includes("invalid api key")) {
    res.status(500).json({ error: "AI service configuration error" });
    return true;
  }
  return false;
}

// ─── Part 1: Smart Listing Search ────────────────────────────────────────────
export async function aiSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { query } = req.body;
    if (!query) {
      res.status(400).json({ error: "query is required" });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;

    const prompt = `You are a search filter extractor for a property rental platform.
Given a natural language query, extract search filters and return ONLY a JSON object.

Fields to extract:
- location: city or area name as a string, or null
- type: one of "APARTMENT", "HOUSE", "VILLA", "CABIN" (uppercase), or null
- maxPrice: maximum price per night as a number, or null
- guests: number of guests as a number, or null

Query: "${query}"

Return only the JSON object. No markdown, no explanation, no extra text.`;

    let filters: { location?: string | null; type?: string | null; maxPrice?: number | null; guests?: number | null };
    try {
      const response = await deterministicModel.invoke(prompt);
      filters = extractJSON(response.content as string) as typeof filters;
    } catch (err) {
      console.error("[AI Search] error:", err);
      res.status(400).json({ error: "Could not extract any filters from your query, please be more specific" });
      return;
    }

    const hasFilters = filters.location || filters.type || filters.maxPrice || filters.guests;
    if (!hasFilters) {
      res.status(400).json({ error: "Could not extract any filters from your query, please be more specific" });
      return;
    }

    const where: Prisma.ListingWhereInput = {};
    if (filters.location) where.location = { contains: filters.location, mode: "insensitive" };
    if (filters.type) where.type = filters.type as any;
    if (filters.maxPrice) where.pricePerNight = { lte: filters.maxPrice };
    if (filters.guests) where.guests = { gte: filters.guests };

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip,
        take: limit,
        include: { host: { select: { id: true, name: true, email: true, avatar: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.listing.count({ where }),
    ]);

    res.json({
      filters,
      data: listings,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    if (handleGroqError(error, res)) return;
    next(error);
  }
}

// ─── Part 2: Listing Description Generator ───────────────────────────────────
export async function generateDescription(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const listingId = req.params.id as string;
    const tone: string = req.body.tone ?? "professional";

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    if (listing.hostId !== req.userId) {
      res.status(403).json({ error: "You can only generate descriptions for your own listings" });
      return;
    }

    const toneInstructions: Record<string, string> = {
      professional: "formal, clear, and business-like. Focus on features and value proposition.",
      casual: "friendly, relaxed, and conversational. Make it feel warm and inviting.",
      luxury: "elegant, premium, and aspirational. Use sophisticated language that evokes exclusivity.",
    };
    const toneGuide = toneInstructions[tone] ?? toneInstructions["professional"];

    const prompt = `Write a compelling property listing description that is ${toneGuide}

Property details:
- Title: ${listing.title}
- Location: ${listing.location}
- Type: ${listing.type}
- Price: $${listing.pricePerNight}/night
- Guests: ${listing.guests}
- Amenities: ${listing.amenities.join(", ")}
- Current description: ${listing.description}

Write a single paragraph description (3-5 sentences). Return only the description text, no labels or extra content.`;

    const response = await model.invoke(prompt);
    const description = (response.content as string).trim();

    const updated = await prisma.listing.update({
      where: { id: listingId },
      data: { description },
    });

    res.json({ description, listing: updated });
  } catch (error) {
    if (handleGroqError(error, res)) return;
    next(error);
  }
}

// ─── Part 3: Guest Support Chatbot ───────────────────────────────────────────
export async function aiChat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sessionId, message, listingId } = req.body;
    if (!sessionId || !message) {
      res.status(400).json({ error: "sessionId and message are required" });
      return;
    }

    let systemContent = `You are a helpful guest support assistant for an Airbnb-like platform.
Answer questions clearly and helpfully. If you don't know something, say so.`;

    if (listingId) {
      const listing = await prisma.listing.findUnique({ where: { id: listingId } });
      if (listing) {
        systemContent = `You are a helpful guest support assistant for an Airbnb-like platform.
You are currently helping a guest with questions about this specific listing:

Title: ${listing.title}
Location: ${listing.location}
Price per night: $${listing.pricePerNight}
Max guests: ${listing.guests}
Type: ${listing.type}
Amenities: ${listing.amenities.join(", ")}
Description: ${listing.description}

Answer questions about this listing accurately based on the details above.
If asked something not covered by the listing details, say you don't have that information.`;
      }
    }

    const history = sessions.get(sessionId) ?? [];
    const messages: BaseMessage[] = [new SystemMessage(systemContent), ...history, new HumanMessage(message)];

    const response = await model.invoke(messages);
    const aiResponse = (response.content as string).trim();

    history.push(new HumanMessage(message));
    history.push(new AIMessage(aiResponse));
    const trimmed = history.slice(-20);
    sessions.set(sessionId, trimmed);

    res.json({ response: aiResponse, sessionId, messageCount: trimmed.length });
  } catch (error) {
    if (handleGroqError(error, res)) return;
    next(error);
  }
}

// ─── Part 4: AI Booking Recommendation ───────────────────────────────────────
export async function aiRecommend(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookings = await prisma.booking.findMany({
      where: { guestId: req.userId! },
      include: { listing: { select: { title: true, location: true, type: true, pricePerNight: true, guests: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    if (bookings.length === 0) {
      res.status(400).json({ error: "No booking history found. Make some bookings first to get recommendations." });
      return;
    }

    const historySummary = bookings
      .map((b, i) => `${i + 1}. ${b.listing.title} in ${b.listing.location} — ${b.listing.type}, $${b.listing.pricePerNight}/night, ${b.guests} guests`)
      .join("\n");

    const prompt = `You are a recommendation engine for a property rental platform.
Analyze this user's booking history and suggest search filters to find their next ideal property.

Booking history:
${historySummary}

Return ONLY a JSON object in this exact format:
{
  "preferences": "brief description of what the user seems to like",
  "searchFilters": {
    "location": "city name as string or null",
    "type": "one of APARTMENT, HOUSE, VILLA, CABIN or null",
    "maxPrice": number or null,
    "guests": number or null
  },
  "reason": "brief explanation of why these filters were chosen"
}

Return only the JSON. No markdown, no extra text.`;

    let parsed: { preferences: string; searchFilters: any; reason: string };
    try {
      const response = await deterministicModel.invoke(prompt);
      parsed = extractJSON(response.content as string) as typeof parsed;
    } catch {
      res.status(500).json({ error: "AI could not generate recommendations, please try again" });
      return;
    }

    const { searchFilters } = parsed;
    const bookedIds = bookings.map((b) => b.listingId);

    const where: Prisma.ListingWhereInput = { id: { notIn: bookedIds } };
    if (searchFilters.location) where.location = { contains: searchFilters.location, mode: "insensitive" };
    if (searchFilters.type) where.type = searchFilters.type;
    if (searchFilters.maxPrice) where.pricePerNight = { lte: searchFilters.maxPrice };
    if (searchFilters.guests) where.guests = { gte: searchFilters.guests };

    const recommendations = await prisma.listing.findMany({
      where,
      take: 5,
      include: { host: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      preferences: parsed.preferences,
      reason: parsed.reason,
      searchFilters,
      recommendations,
    });
  } catch (error) {
    if (handleGroqError(error, res)) return;
    next(error);
  }
}

// ─── Part 5: Review Summarizer ────────────────────────────────────────────────
export async function reviewSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const listingId = req.params.id as string;
    const cacheKey = `ai:review-summary:${listingId}`;

    const cached = getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    const reviews = await prisma.review.findMany({
      where: { listingId: listingId as string },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }) as unknown as Array<{ id: string; rating: number; comment: string; user: { name: string } }>;

    if (reviews.length < 3) {
      res.status(400).json({ error: "Not enough reviews to generate a summary (minimum 3 required)" });
      return;
    }

    const averageRating = Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10;

    const reviewsText = reviews
      .map((r) => `- ${r.user.name} (${r.rating}/5): ${r.comment}`)
      .join("\n");

    const prompt = `You are analyzing guest reviews for a property rental listing. Provide a structured analysis.

Reviews:
${reviewsText}

Return ONLY a JSON object in this exact format:
{
  "summary": "2-3 sentence overall summary of guest experience",
  "positives": ["specific thing guests praised 1", "specific thing guests praised 2", "specific thing guests praised 3"],
  "negatives": ["specific complaint 1"] or []
}

Return only the JSON. No markdown, no extra text.`;

    let parsed: { summary: string; positives: string[]; negatives: string[] };
    try {
      const response = await model.invoke(prompt);
      parsed = extractJSON(response.content as string) as typeof parsed;
    } catch {
      res.status(500).json({ error: "AI could not generate a summary, please try again" });
      return;
    }

    const result = {
      summary: parsed.summary,
      positives: parsed.positives,
      negatives: parsed.negatives ?? [],
      averageRating,
      totalReviews: reviews.length,
    };

    setCache(cacheKey, result, 600);
    res.json(result);
  } catch (error) {
    if (handleGroqError(error, res)) return;
    next(error);
  }
}
