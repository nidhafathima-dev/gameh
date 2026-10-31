import { spiritConfig } from '../config/spirits.js';

export class SpiritEngine {
  constructor(ouijaBoard, soundSystem, onLetterHit, onSpellComplete) {
    this.board = ouijaBoard;
    this.audio = soundSystem;
    this.onLetterHit = onLetterHit || (() => {});
    this.onSpellComplete = onSpellComplete || (() => {});

    this.isSpelling = false;
    this.letterQueue = [];
    this.currentLetter = null;
    this.timer = 0;
    this.dwellDuration = 0.85; // seconds to pause over each letter
    this.transitionDuration = 0.95; // seconds to glide between letters
    this.state = 'IDLE'; // 'IDLE', 'MOVING', 'DWELLING'

    this.currentText = '';
    this.currentSpirit = null;
    this.hasTriggeredReveal = false;

    // Standard atmospheric supernatural responses for non-identity inquiries
    this.spiritResponses = {
      'is anyone here': 'YES',
      'are you there': 'YES',
      'how did you die': 'IN THE FIRE',
      'what do you want': 'YOUR SOUL',
      'are we alone': 'NO',
      'should i leave': 'TOO LATE',
      'can you see me': 'BEHIND YOU',
      'where are you': 'WITHIN THE WALLS',
      'what year is it': '1892',
      'is this place haunted': 'ETERNALLY',
      'can you help me': 'NO ESCAPE',
      'goodbye': 'GOODBYE',
    };

    this.fallbackResponses = [
      'WATCHING',
      'NEVER ALONE',
      'BEHIND YOU',
      'DO NOT SLEEP',
      'IN THE SHADOWS',
      'COLD',
      'STAY FOREVER',
      'LISTEN',
      'TOO CLOSE',
      'YES',
      'NO',
      'LOOK UP',
    ];
  }

  // Determine answer for a user question, recognizing spirit identity inquiries
  getAnswerForQuestion(question) {
    const cleanQ = question.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

    // 1. Check if this is an inquiry about identity / name
    if (spiritConfig.isIdentityQuestion(cleanQ)) {
      const spirit = spiritConfig.getNextSpirit();
      this.currentSpirit = spirit;
      return {
        text: spirit.name.toUpperCase(),
        isIdentity: true,
        spirit: spirit,
      };
    }

    // Reset current spirit for non-identity answers
    this.currentSpirit = null;

    // 2. Direct exact matches
    for (const [key, answer] of Object.entries(this.spiritResponses)) {
      if (cleanQ.includes(key) || key.includes(cleanQ)) {
        return { text: answer, isIdentity: false, spirit: null };
      }
    }

    // 3. Keyword heuristics
    if (cleanQ.includes('yes') || cleanQ.includes('no')) {
      return { text: Math.random() > 0.4 ? 'YES' : 'NO', isIdentity: false, spirit: null };
    }
    if (cleanQ.includes('where')) {
      return { text: 'ALL AROUND', isIdentity: false, spirit: null };
    }
    if (cleanQ.includes('die') || cleanQ.includes('kill') || cleanQ.includes('blood') || cleanQ.includes('dead')) {
      return { text: 'BURIED DEEP', isIdentity: false, spirit: null };
    }
    if (cleanQ.includes('leave') || cleanQ.includes('run') || cleanQ.includes('safe') || cleanQ.includes('escape')) {
      return { text: 'RUN NOW', isIdentity: false, spirit: null };
    }

    // 4. Random chilling fallback response
    const fallback = this.fallbackResponses[Math.floor(Math.random() * this.fallbackResponses.length)];
    return { text: fallback, isIdentity: false, spirit: null };
  }

  spellText(answerData) {
    if (this.isSpelling) return;

    // Support either raw string or structured answerData
    let text = '';
    if (typeof answerData === 'string') {
      text = answerData;
      this.currentSpirit = null;
    } else if (answerData && typeof answerData === 'object') {
      text = answerData.text || '';
      this.currentSpirit = answerData.spirit || null;
    }

    this.isSpelling = true;
    this.hasTriggeredReveal = false;
    this.letterQueue = [];
    this.currentText = text.toUpperCase().trim();

    const upper = this.currentText;

    // If whole words are YES, NO, or GOODBYE, target directly
    if (upper === 'YES' || upper === 'NO' || upper === 'GOODBYE') {
      this.letterQueue.push(upper);
    } else {
      // Split into single letters and numbers, skipping spaces (spaces trigger a brief pause)
      for (let i = 0; i < upper.length; i++) {
        const char = upper[i];
        if (char === ' ') {
          this.letterQueue.push('SPACE');
        } else if (this.board.letterCoords[char]) {
          this.letterQueue.push(char);
        }
      }
    }

    this.nextTarget();
  }

  nextTarget() {
    if (this.letterQueue.length === 0) {
      // All letters have been reached! Complete reveal.
      if (!this.hasTriggeredReveal) {
        this.hasTriggeredReveal = true;
        // Pause briefly after final letter is revealed
        setTimeout(() => {
          this.onSpellComplete(this.currentText, this.currentSpirit);
        }, 800);

        // Slide planchette gently back towards resting position after full reveal sequence
        setTimeout(() => {
          this.board.setTargetSymbol('REST');
          this.isSpelling = false;
        }, 3200);
      }
      return;
    }

    this.currentLetter = this.letterQueue.shift();

    if (this.currentLetter === 'SPACE') {
      setTimeout(() => this.nextTarget(), 400);
      return;
    }

    this.board.setTargetSymbol(this.currentLetter);
    this.audio.playPlanchetteSlide();
    this.state = 'MOVING';
    this.timer = 0;
  }

  update(delta) {
    if (!this.isSpelling) return;

    this.timer += delta;

    if (this.state === 'MOVING') {
      if (this.timer >= this.transitionDuration) {
        // Arrived at letter
        this.state = 'DWELLING';
        this.timer = 0;
        this.audio.playLetterArrivalChime();
        this.audio.playSpiritWhisper();
        this.onLetterHit(this.currentLetter);
      }
    } else if (this.state === 'DWELLING') {
      if (this.timer >= this.dwellDuration) {
        this.nextTarget();
      }
    }
  }
}
