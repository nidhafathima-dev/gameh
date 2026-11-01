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

  // Find a specific spirit by name
  getSpiritByName(name) {
    if (!name) return null;
    const clean = name.trim().toUpperCase();
    return this.spirits.find((s) => s.name.toUpperCase() === clean) || null;
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

  // Check if any spirit has a custom response with audio for this question
  getCustomResponseForQuestion(question, activeSpirit = null) {
    if (!question || typeof question !== 'string') return null;
    const q = question.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

    // Prioritize active spirit, then Nagavalli, then all configured spirits
    const spiritsToCheck = [];
    if (activeSpirit) spiritsToCheck.push(activeSpirit);
    const nagavalli = this.getSpiritByName('Nagavalli');
    if (nagavalli && !spiritsToCheck.includes(nagavalli)) spiritsToCheck.push(nagavalli);
    for (const s of this.spirits) {
      if (!spiritsToCheck.includes(s)) spiritsToCheck.push(s);
    }

    for (const spirit of spiritsToCheck) {
      if (spirit.customResponses) {
        for (const [trigger, resp] of Object.entries(spirit.customResponses)) {
          const cleanTrigger = trigger.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
          if (q.includes(cleanTrigger) || cleanTrigger.includes(q)) {
            return {
              text: resp.text,
              audio: resp.audio,
              spirit: spirit,
            };
          }
        }
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
