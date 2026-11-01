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

  // Find a specific spirit by ID
  getSpiritById(id) {
    if (!id) return null;
    return this.spirits.find((s) => s.id === id) || null;
  }

  // Find a specific spirit by name, id, or alias
  getSpiritByName(name) {
    if (!name) return null;
    const clean = name.trim().toUpperCase();
    return this.spirits.find((s) => {
      if (s.name && s.name.toUpperCase() === clean) return true;
      if (s.id && s.id.toUpperCase() === clean) return true;
      if (Array.isArray(s.aliases) && s.aliases.some((a) => a.toUpperCase() === clean)) return true;
      return false;
    }) || null;
  }

  // Get next spirit identity in sequence (cycles through configured spirits)
  getNextSpirit() {
    if (this.spirits.length === 0) {
      return { id: 'spirit_1', name: 'Chatan', audio: '/assets/audio/CHATHAN.mp4' };
    }
    const spirit = this.spirits[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.spirits.length;
    this.activeSpirit = spirit;
    return spirit;
  }

  // Randomly select a spirit from configured spirits list (expandable for multiple spirits)
  getRandomSpirit() {
    if (this.spirits.length === 0) {
      return { id: 'spirit_1', name: 'Chatan', audio: '/assets/audio/CHATHAN.mp4' };
    }
    const idx = Math.floor(Math.random() * this.spirits.length);
    this.activeSpirit = this.spirits[idx];
    return this.activeSpirit;
  }

  // Set the currently active spirit
  setActiveSpirit(nameOrIndexOrSpirit) {
    if (!nameOrIndexOrSpirit) return this.activeSpirit;
    if (typeof nameOrIndexOrSpirit === 'number') {
      if (nameOrIndexOrSpirit >= 0 && nameOrIndexOrSpirit < this.spirits.length) {
        this.currentIndex = nameOrIndexOrSpirit;
        this.activeSpirit = this.spirits[this.currentIndex];
      }
    } else if (typeof nameOrIndexOrSpirit === 'string') {
      const found = this.getSpiritByName(nameOrIndexOrSpirit);
      if (found) {
        this.activeSpirit = found;
        this.currentIndex = this.spirits.indexOf(found);
      }
    } else if (typeof nameOrIndexOrSpirit === 'object' && nameOrIndexOrSpirit.name) {
      this.activeSpirit = nameOrIndexOrSpirit;
      this.currentIndex = this.spirits.indexOf(nameOrIndexOrSpirit);
    }
    return this.activeSpirit;
  }

  // Retrieve spirit-specific predefined answer for a question
  getCustomResponseForQuestion(question, activeSpirit = null) {
    if (!question || typeof question !== 'string') return null;
    const q = question.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

    // 1. Detect if the question explicitly mentions a spirit name or alias
    let targetSpirit = null;
    for (const spirit of this.spirits) {
      const namesToCheck = [spirit.name, spirit.id, ...(spirit.aliases || [])];
      for (const n of namesToCheck) {
        if (!n) continue;
        const cleanName = n.toLowerCase();
        if (q.includes(cleanName)) {
          targetSpirit = spirit;
          break;
        }
      }
      if (targetSpirit) break;
    }

    // 2. If no spirit explicitly mentioned, resolve provided activeSpirit or fallback to this.activeSpirit
    if (!targetSpirit) {
      if (typeof activeSpirit === 'string') {
        targetSpirit = this.getSpiritByName(activeSpirit) || this.getSpiritById(activeSpirit);
      } else if (activeSpirit && typeof activeSpirit === 'object') {
        targetSpirit = activeSpirit;
      }
    }
    if (!targetSpirit) {
      targetSpirit = this.activeSpirit || this.spirits[0];
    }

    // Standardized intent categories for predefined questions
    const questionCategories = [
      { key: 'how did you die', triggers: ['how did you die', 'how you died', 'cause of death', 'who killed you', 'how die', 'die'] },
      { key: 'what do you want', triggers: ['what do you want', 'what want', 'what do you desire', 'what do you need', 'why are you here', 'want'] },
      { key: 'are we alone', triggers: ['are we alone', 'am i alone', 'is anyone else here', 'anyone else here', 'alone'] },
      { key: 'can you see me', triggers: ['can you see me', 'do you see me', 'can you see', 'see me'] },
    ];

    const findInSpirit = (spirit) => {
      if (!spirit || !spirit.customResponses) return null;

      // 1. Direct or partial trigger matching
      for (const [trigger, resp] of Object.entries(spirit.customResponses)) {
        const cleanTrigger = trigger.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
        if (q.includes(cleanTrigger) || cleanTrigger.includes(q)) {
          return {
            text: typeof resp === 'string' ? resp : resp.text,
            displayText: typeof resp === 'object' && resp.displayText ? resp.displayText : (typeof resp === 'string' ? resp : resp.text),
            audio: typeof resp === 'object' ? resp.audio || null : null,
            spirit: spirit,
          };
        }
      }

      // 2. Intent trigger categories
      for (const cat of questionCategories) {
        const matchesCategory = cat.triggers.some((t) => q.includes(t));
        if (matchesCategory && spirit.customResponses[cat.key]) {
          const resp = spirit.customResponses[cat.key];
          return {
            text: typeof resp === 'string' ? resp : resp.text,
            displayText: typeof resp === 'object' && resp.displayText ? resp.displayText : (typeof resp === 'string' ? resp : resp.text),
            audio: typeof resp === 'object' ? resp.audio || null : null,
            spirit: spirit,
          };
        }
      }

      return null;
    };

    // First check target spirit
    const result = findInSpirit(targetSpirit);
    if (result) {
      this.activeSpirit = targetSpirit;
      return result;
    }

    // Check remaining spirits
    for (const spirit of this.spirits) {
      if (spirit === targetSpirit) continue;
      const otherResult = findInSpirit(spirit);
      if (otherResult) {
        this.activeSpirit = spirit;
        return otherResult;
      }
    }

    return null;
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

  // Automatically discover and resolve custom audio file if dropped in spirit_audios/
  async resolveSpiritAudioUrl(spirit) {
    if (!spirit) return null;
    if (spirit._resolvedAudio !== undefined) {
      return spirit._resolvedAudio;
    }

    const candidates = [];
    if (spirit.audio) {
      candidates.push(spirit.audio);
    }

    const baseNames = new Set([
      'chatan',
      'chathan',
      'CHATHAN',
      spirit.name ? spirit.name.toLowerCase() : null,
      spirit.id ? spirit.id.toLowerCase() : null,
    ].filter(Boolean));

    const extensions = ['mp4', 'wav', 'mp3', 'm4a', 'ogg'];
    for (const base of baseNames) {
      for (const ext of extensions) {
        candidates.push(`/assets/audio/${base}.${ext}`);
      }
    }

    for (const url of candidates) {
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (res.ok) {
          spirit._resolvedAudio = url;
          return url;
        }
      } catch (err) {
        // proceed
      }
    }

    spirit._resolvedAudio = spirit.audio || '/assets/audio/CHATHAN.mp4';
    return spirit._resolvedAudio;
  }
}

export const spiritConfig = new SpiritConfigManager();
