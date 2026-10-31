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

    // Atmospheric horror spirit response knowledge base
    this.spiritResponses = {
      'is anyone here': 'YES',
      'are you there': 'YES',
      'who are you': 'THE FORGOTTEN',
      'what is your name': 'MALACHI',
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

  getAnswerForQuestion(question) {
    const cleanQ = question.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

    // Check direct matches
    for (const [key, answer] of Object.entries(this.spiritResponses)) {
      if (cleanQ.includes(key) || key.includes(cleanQ)) {
        return answer;
      }
    }

    // Keyword heuristics
    if (cleanQ.includes('yes') || cleanQ.includes('no')) {
      return Math.random() > 0.4 ? 'YES' : 'NO';
    }
    if (cleanQ.includes('who') || cleanQ.includes('name')) {
      return 'THE WATCHER';
    }
    if (cleanQ.includes('where')) {
      return 'ALL AROUND';
    }
    if (cleanQ.includes('die') || cleanQ.includes('kill') || cleanQ.includes('blood')) {
      return 'BURIED DEEP';
    }
    if (cleanQ.includes('leave') || cleanQ.includes('run') || cleanQ.includes('safe')) {
      return 'RUN NOW';
    }

    // Pick random chilling response
    return this.fallbackResponses[Math.floor(Math.random() * this.fallbackResponses.length)];
  }

  spellText(text) {
    if (this.isSpelling) return;

    this.isSpelling = true;
    this.letterQueue = [];
    this.spelledSoFar = '';

    const upper = text.toUpperCase().trim();

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
      // Finished spelling! Slide back towards REST or GOODBYE
      setTimeout(() => {
        this.board.setTargetSymbol('REST');
        this.isSpelling = false;
        this.onSpellComplete();
      }, 1200);
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
        // Arrived at letter!
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
