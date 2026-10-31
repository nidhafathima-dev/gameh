import rawConfig from './spirits.json';

/**
 * Configured Spirit Identities and Audio Association System
 * Allows easy modification, addition, and configuration of spirit names and audio files.
 */
export class SpiritConfigManager {
  constructor(config = rawConfig) {
    this.spirits = Array.isArray(config?.spirits) ? config.spirits : [];
    this.currentIndex = 0;
    this.activeSpirit = this.spirits[0] || null;
  }

  // Get all configured spirits
  getSpirits() {
    return this.spirits;
  }

  // Find a specific spirit by name
  getSpiritByName(name) {
    if (!name) return null;
    const clean = name.trim().toUpperCase();
    return this.spirits.find((s) => s.name.toUpperCase() === clean) || null;
  }

  // Get next spirit identity in sequence (cycles through configured spirits)
  getNextSpirit() {
    if (this.spirits.length === 0) {
      return { name: 'UNKNOWN', audio: null };
    }
    const spirit = this.spirits[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.spirits.length;
    this.activeSpirit = spirit;
    return spirit;
  }

  // Set the currently active spirit
  setActiveSpirit(nameOrIndex) {
    if (typeof nameOrIndex === 'number') {
      if (nameOrIndex >= 0 && nameOrIndex < this.spirits.length) {
        this.currentIndex = nameOrIndex;
        this.activeSpirit = this.spirits[this.currentIndex];
      }
    } else if (typeof nameOrIndex === 'string') {
      const found = this.getSpiritByName(nameOrIndex);
      if (found) {
        this.activeSpirit = found;
        this.currentIndex = this.spirits.indexOf(found);
      }
    }
    return this.activeSpirit;
  }

  // Detect if a user question is asking about spirit identity / name
  isIdentityQuestion(question) {
    if (!question || typeof question !== 'string') return false;
    const q = question.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

    const identityTriggers = [
      'who are you',
      'who is here',
      'who is this',
      'what is your name',
      'whats your name',
      'what are you called',
      'who is speaking',
      'who speaks',
      'identify yourself',
      'tell me your name',
      'give me a name',
      'who died here',
      'who lingers',
      'who is with us',
      'who am i talking to',
      'who am i speaking to',
      'reveal yourself',
      'your name',
    ];

    for (const trigger of identityTriggers) {
      if (q.includes(trigger)) return true;
    }

    // Heuristics for single words or short queries like "who", "name", "who's there"
    const words = q.split(/\s+/);
    if (words.includes('who') && (words.includes('you') || words.includes('here') || words.includes('there') || words.includes('this') || words.length === 1)) {
      return true;
    }
    if (words.includes('name')) {
      return true;
    }
    if (words.includes('identify')) {
      return true;
    }

    return false;
  }
}

export const spiritConfig = new SpiritConfigManager();
