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

  // Resolve audio for a spirit (supports direct mapping or auto-discovery in spirit_audios/)
  async resolveAudioForSpirit(spirit) {
    return spiritConfig.resolveSpiritAudioUrl(spirit);
  }

  // Determine answer for a user question, recognizing spirit identity inquiries
  getAnswerForQuestion(question, requestedSpirit = null) {
    const cleanQ = question.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

    // 0. Check custom spirit-specific question responses (e.g. Chathan or Nagavalli)
    const customResp = spiritConfig.getCustomResponseForQuestion(cleanQ, requestedSpirit || this.currentSpirit);
    if (customResp) {
      this.currentSpirit = customResp.spirit;
      this.customAudio = customResp.audio;
      return {
        text: customResp.text.toUpperCase(),
        displayText: customResp.displayText || customResp.text,
        isIdentity: false,
        spirit: customResp.spirit,
        customAudio: customResp.audio,
      };
    }

    // 1. Check if this is an inquiry about identity / name
    if (spiritConfig.isIdentityQuestion(cleanQ)) {
      let spirit = null;
      if (requestedSpirit) {
        spirit = typeof requestedSpirit === 'string'
          ? spiritConfig.getSpiritByName(requestedSpirit)
          : requestedSpirit;
      }
      if (!spirit) {
        spirit = spiritConfig.getRandomSpirit();
      }
      this.currentSpirit = spirit;
      return {
        text: spirit.name.toUpperCase(),
        displayText: spirit.name,
        isIdentity: true,
        spirit: spirit,
      };
    }

    // 2. Direct exact matches
    for (const [key, answer] of Object.entries(this.spiritResponses)) {
      if (cleanQ.includes(key) || key.includes(cleanQ)) {
        return { text: answer, displayText: answer, isIdentity: false, spirit: this.currentSpirit };
      }
    }

    // 3. Keyword heuristics
    if (cleanQ.includes('yes') || cleanQ.includes('no')) {
      const a = Math.random() > 0.4 ? 'YES' : 'NO';
      return { text: a, displayText: a, isIdentity: false, spirit: this.currentSpirit };
    }
    if (cleanQ.includes('where')) {
      return { text: 'ALL AROUND', displayText: 'All around', isIdentity: false, spirit: this.currentSpirit };
    }
    if (cleanQ.includes('die') || cleanQ.includes('kill') || cleanQ.includes('blood') || cleanQ.includes('dead')) {
      return { text: 'BURIED DEEP', displayText: 'Buried deep', isIdentity: false, spirit: this.currentSpirit };
    }
    if (cleanQ.includes('leave') || cleanQ.includes('run') || cleanQ.includes('safe') || cleanQ.includes('escape')) {
      return { text: 'RUN NOW', displayText: 'Run now', isIdentity: false, spirit: this.currentSpirit };
    }

    // 4. Random chilling fallback response
    const fallback = this.fallbackResponses[Math.floor(Math.random() * this.fallbackResponses.length)];
    return { text: fallback, displayText: fallback, isIdentity: false, spirit: this.currentSpirit };
  }

  spellText(answerData) {
    if (this.isSpelling) return;

    // Support either raw string or structured answerData
    let text = '';
    if (typeof answerData === 'string') {
      text = answerData;
      this.currentSpirit = null;
      this.customAudio = null;
    } else if (answerData && typeof answerData === 'object') {
      text = answerData.text || '';
      this.currentSpirit = answerData.spirit || null;
      this.customAudio = answerData.customAudio || null;
    }

    this.isSpelling = true;
    this.hasTriggeredReveal = false;
    this.letterQueue = [];
    this.currentText = text.toUpperCase().trim();
    this.revealedText = '';

    const upper = this.currentText;

    // If whole words are YES, NO, or GOODBYE, target directly
    if (upper === 'YES' || upper === 'NO' || upper === 'GOODBYE') {
      this.letterQueue.push({
        type: 'SPECIAL',
        target: upper,
        value: upper,
      });
    } else {
      let pendingSpace = false;
      for (let i = 0; i < upper.length; i++) {
        const char = upper[i];
        if (char === ' ') {
          pendingSpace = true;
        } else if (this.board.letterCoords[char]) {
          this.letterQueue.push({
            type: 'LETTER',
            target: char,
            char: char,
            hasLeadingSpace: pendingSpace,
          });
          pendingSpace = false;
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
        // Wait approximately 500–800 milliseconds after final letter is revealed
        setTimeout(() => {
          this.onSpellComplete(this.currentText, this.currentSpirit, this.customAudio);
        }, 650);

        // Slide planchette gently back towards resting position after full reveal sequence
        setTimeout(() => {
          this.board.setTargetSymbol('REST');
          this.isSpelling = false;
        }, 3200);
      }
      return;
    }

    this.currentItem = this.letterQueue.shift();
    this.currentLetter = this.currentItem.target;

    this.board.setTargetSymbol(this.currentItem.target);
    this.audio.playPlanchetteSlide();
    this.state = 'MOVING';
    this.timer = 0;
  }

  update(delta) {
    if (!this.isSpelling) return;

    this.timer += delta;

    if (this.state === 'MOVING') {
      if (this.timer >= this.transitionDuration) {
        // Arrived at letter/target
        this.state = 'DWELLING';
        this.timer = 0;
        this.audio.playLetterArrivalChime();
        this.audio.playSpiritWhisper();

        // Update revealed text cleanly preserving words and spaces
        if (this.currentItem) {
          if (this.currentItem.type === 'SPECIAL') {
            this.revealedText = this.currentItem.value;
          } else {
            if (this.currentItem.hasLeadingSpace) {
              this.revealedText += ' ';
            }
            this.revealedText += this.currentItem.char;
          }
        }

        this.onLetterHit(this.currentLetter, this.revealedText, this.currentText);
      }
    } else if (this.state === 'DWELLING') {
      if (this.timer >= this.dwellDuration) {
        this.nextTarget();
      }
    }
  }
}
