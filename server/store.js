// In-memory fallback data store when MongoDB is offline
import crypto from 'crypto';

class MemoryStore {
  constructor() {
    this.users = new Map(); // id -> user
    this.usersByEmail = new Map(); // email -> user
    this.watchlist = new Map(); // id -> item
    this.comments = new Map(); // id -> comment
    this.ratings = new Map(); // `${userId}_${movieId}` -> rating
    this.conversations = new Map(); // id -> conversation
  }

  // Users
  findUserByEmail(email) {
    return this.usersByEmail.get(email.toLowerCase()) || null;
  }

  findUserById(id) {
    const u = this.users.get(id);
    if (!u) return null;
    return {
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      createdAt: u.createdAt,
      toJSON() {
        return {
          id: u.id,
          email: u.email,
          displayName: u.displayName,
          createdAt: u.createdAt,
        };
      },
    };
  }

  createUser({ email, password, displayName }) {
    const id = crypto.randomUUID();
    const user = {
      id,
      email: email.toLowerCase(),
      password,
      displayName: displayName || '',
      createdAt: new Date(),
    };
    this.users.set(id, user);
    this.usersByEmail.set(user.email, user);
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
      toJSON() {
        return {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          createdAt: user.createdAt,
        };
      },
    };
  }

  // Watchlist
  getWatchlist(userId) {
    const items = [];
    for (const item of this.watchlist.values()) {
      if (item.userId === userId) {
        items.push({ ...item });
      }
    }
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  addWatchlist({ userId, movieId, movieTitle, mediaType, posterPath }) {
    // Check existing
    for (const [id, item] of this.watchlist.entries()) {
      if (item.userId === userId && item.movieId === movieId) {
        item.movieTitle = movieTitle;
        item.mediaType = mediaType || 'movie';
        item.posterPath = posterPath || '';
        return { ...item };
      }
    }
    const id = crypto.randomUUID();
    const item = {
      id,
      userId,
      movieId,
      movieTitle,
      mediaType: mediaType || 'movie',
      posterPath: posterPath || '',
      createdAt: new Date().toISOString(),
    };
    this.watchlist.set(id, item);
    return { ...item };
  }

  removeWatchlist(id, userId) {
    const item = this.watchlist.get(id);
    if (item && item.userId === userId) {
      this.watchlist.delete(id);
      return true;
    }
    return false;
  }

  checkWatchlist(userId, movieId) {
    for (const item of this.watchlist.values()) {
      if (item.userId === userId && item.movieId === movieId) return true;
    }
    return false;
  }

  // Comments
  getComments(movieId) {
    const results = [];
    for (const comment of this.comments.values()) {
      if (comment.movieId === movieId) {
        results.push({ ...comment });
      }
    }
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  addComment({ userId, userName, movieId, content, parentId }) {
    const id = crypto.randomUUID();
    const comment = {
      id,
      userId,
      userName,
      movieId,
      content,
      parentId: parentId || null,
      createdAt: new Date().toISOString(),
    };
    this.comments.set(id, comment);
    return { ...comment };
  }

  deleteComment(id, userId) {
    const comment = this.comments.get(id);
    if (comment && comment.userId === userId) {
      this.comments.delete(id);
      return true;
    }
    return false;
  }

  // Ratings
  getRatings(movieId) {
    let likes = 0;
    let dislikes = 0;
    for (const r of this.ratings.values()) {
      if (r.movieId === movieId) {
        if (r.type === 'like') likes++;
        if (r.type === 'dislike') dislikes++;
      }
    }
    return { likes, dislikes };
  }

  getUserRating(userId, movieId) {
    const key = `${userId}_${movieId}`;
    return this.ratings.get(key)?.type || null;
  }

  setRating({ userId, movieId, type }) {
    const key = `${userId}_${movieId}`;
    const existing = this.ratings.get(key);
    if (existing?.type === type) {
      this.ratings.delete(key);
      return { rating: null, removed: true };
    }
    this.ratings.set(key, { userId, movieId, type, updatedAt: new Date() });
    return { rating: type };
  }

  // Conversations
  getConversations(userId) {
    const results = [];
    for (const conv of this.conversations.values()) {
      if (conv.userId === userId) {
        results.push({
          id: conv.id,
          title: conv.title,
          updatedAt: conv.updatedAt,
          createdAt: conv.createdAt,
        });
      }
    }
    return results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  getConversation(id, userId) {
    const conv = this.conversations.get(id);
    if (!conv || conv.userId !== userId) return null;
    return { ...conv };
  }

  createConversation({ userId, title, messages }) {
    const id = crypto.randomUUID();
    const conv = {
      id,
      userId,
      title: title || 'New Chat',
      messages: messages || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.conversations.set(id, conv);
    return { ...conv };
  }

  updateConversation(id, userId, { messages, title }) {
    const conv = this.conversations.get(id);
    if (!conv || conv.userId !== userId) return null;
    if (messages !== undefined) conv.messages = messages;
    if (title !== undefined) conv.title = title;
    conv.updatedAt = new Date().toISOString();
    return { ...conv };
  }

  deleteConversation(id, userId) {
    const conv = this.conversations.get(id);
    if (conv && conv.userId === userId) {
      this.conversations.delete(id);
      return true;
    }
    return false;
  }
}

export const memoryStore = new MemoryStore();
