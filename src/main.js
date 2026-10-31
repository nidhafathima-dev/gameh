import * as THREE from 'three';
import { SceneManager } from './scene/SceneManager.js';
import { Forest } from './environment/Forest.js';
import { Cabin } from './environment/Cabin.js';
import { BatSwarm } from './environment/Bats.js';
import { OuijaBoard } from './ouija/OuijaBoard.js';
import { SpiritEngine } from './ouija/SpiritEngine.js';
import { SoundSystem } from './audio/SoundSystem.js';
import { Timeline, PHASES } from './cinematics/Timeline.js';

class App {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.sound = new SoundSystem();
    this.sceneManager = new SceneManager(this.container);

    this.forest = new Forest(this.sceneManager.scene);
    this.cabin = new Cabin(this.sceneManager.scene);
    this.bats = new BatSwarm(this.sceneManager.scene);
    this.ouija = new OuijaBoard(this.sceneManager.scene);

    // Position the Ouija board directly on the rustic cabin table
    // Table surface is at (0, 0.85, -29.1)
    this.ouija.boardGroup.position.set(0, 0.87, -29.05);

    // Spirit Engine
    this.spiritEngine = new SpiritEngine(
      this.ouija,
      this.sound,
      (letter) => this.onLetterSpelled(letter),
      () => this.onSpellingDone()
    );

    // Cinematic timeline
    this.timeline = new Timeline({
      sceneManager: this.sceneManager,
      forest: this.forest,
      cabin: this.cabin,
      bats: this.bats,
      ouija: this.ouija,
      audio: this.sound,
      onPhaseChange: (phase) => this.handlePhaseChange(phase),
    });

    this.clock = new THREE.Clock();
    this.isDraggingPlanchette = false;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.initUI();
    this.setupInteractivity();
    this.animate();
  }

  initUI() {
    this.eyelidsOverlay = document.getElementById('eyelids-overlay');
    this.awakeningPrompt = document.getElementById('awakening-prompt');
    this.subtitleText = document.getElementById('narrative-subtitles');
    this.walkControlsHud = document.getElementById('walk-controls-hud');
    this.ouijaUi = document.getElementById('ouija-interactive-ui');
    this.transcriptionBox = document.getElementById('spirit-transcription');
    this.spelledWordEl = document.getElementById('spelled-word');
    this.questionInput = document.getElementById('spirit-question-input');
    this.askBtn = document.getElementById('ask-spirit-btn');
    this.audioToggleBtn = document.getElementById('audio-toggle-btn');
    this.skipIntroBtn = document.getElementById('skip-intro-btn');
    this.replayIntroBtn = document.getElementById('replay-intro-btn');
    this.toggleConsoleBtn = document.getElementById('toggle-console-btn');

    // Toggle Seance Console Collapsed / Expanded
    if (this.toggleConsoleBtn) {
      this.toggleConsoleBtn.addEventListener('click', () => {
        const isCollapsed = this.ouijaUi.classList.toggle('collapsed');
        this.toggleConsoleBtn.textContent = isCollapsed ? '▴ Expand Console' : '▾ Minimize';
      });
    }

    // Awakening click
    this.awakeningPrompt.addEventListener('click', () => {
      this.awakeningPrompt.style.opacity = '0';
      this.awakeningPrompt.style.pointerEvents = 'none';
      this.timeline.startAwakening();
    });

    // Skip intro
    this.skipIntroBtn.addEventListener('click', () => {
      this.sound.init();
      this.sound.resume();
      this.eyelidsOverlay.classList.add('fully-open');
      document.getElementById('vision-blur')?.classList.add('cleared');
      this.timeline.skipToInteractive();
    });

    // Replay intro
    if (this.replayIntroBtn) {
      this.replayIntroBtn.addEventListener('click', () => {
        window.location.reload();
      });
    }

    // Audio toggle
    this.audioToggleBtn.addEventListener('click', () => {
      this.sound.init();
      this.sound.resume();
      const muted = this.sound.toggleMute();
      this.audioToggleBtn.textContent = muted ? '🔇 Unmute' : '🔊 Sound';
    });

    // Spirit Seance questions
    this.askBtn.addEventListener('click', () => this.submitQuestion());
    this.questionInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.submitQuestion();
    });

    // Question pill tags
    document.querySelectorAll('.question-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const q = pill.getAttribute('data-question');
        this.questionInput.value = q;
        this.submitQuestion();
      });
    });
  }

  submitQuestion() {
    const q = this.questionInput.value.trim();
    if (!q || this.spiritEngine.isSpelling) return;

    this.spelledWordEl.textContent = '...';
    this.transcriptionBox.classList.add('active');
    this.subtitleText.textContent = `You whisper: "${q}"`;
    this.subtitleText.classList.add('visible');

    setTimeout(() => {
      this.subtitleText.textContent = 'The candle flames shudder...';
      const answer = this.spiritEngine.getAnswerForQuestion(q);
      this.spiritAnswer = answer;
      this.accumulatedText = '';
      this.spiritEngine.spellText(answer);
    }, 1200);
  }

  onLetterSpelled(letter) {
    if (letter === 'YES' || letter === 'NO' || letter === 'GOODBYE') {
      this.accumulatedText = letter;
    } else {
      this.accumulatedText += letter + ' ';
    }
    this.spelledWordEl.textContent = this.accumulatedText.trim();
  }

  onSpellingDone() {
    this.subtitleText.textContent = `The spirit has answered: "${this.spiritAnswer}"`;
    setTimeout(() => {
      this.subtitleText.classList.remove('visible');
    }, 4500);
  }

  setupInteractivity() {
    // Planchette drag handling in Interactive Phase
    const canvas = this.sceneManager.renderer.domElement;

    const onPointerDown = (e) => {
      if (this.timeline.phase !== PHASES.INTERACTIVE) return;
      if (this.spiritEngine.isSpelling) return;

      this.updateMouseCoords(e);
      this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

      // Intersect with the Ouija Board mesh
      const intersects = this.raycaster.intersectObject(this.ouija.boardMesh, true);
      if (intersects.length > 0) {
        this.isDraggingPlanchette = true;
        this.sound.playPlanchetteSlide();
        this.updatePlanchetteFromHit(intersects[0].point);
      }
    };

    const onPointerMove = (e) => {
      if (!this.isDraggingPlanchette) return;
      this.updateMouseCoords(e);
      this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

      const intersects = this.raycaster.intersectObject(this.ouija.boardMesh, true);
      if (intersects.length > 0) {
        this.updatePlanchetteFromHit(intersects[0].point);
      }
    };

    const onPointerUp = () => {
      this.isDraggingPlanchette = false;
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  updateMouseCoords(e) {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  updatePlanchetteFromHit(worldPoint) {
    // Convert world point to Ouija Board local coordinates
    const localPt = this.ouija.boardGroup.worldToLocal(worldPoint.clone());
    this.ouija.setTargetPosition(localPt.x, localPt.z);
    this.sound.playPlanchetteSlide();
  }

  handlePhaseChange(phase) {
    const visionBlur = document.getElementById('vision-blur');

    switch (phase) {
      case PHASES.AWAKENING:
        this.eyelidsOverlay.classList.add('opening');
        this.subtitleText.textContent = 'Cold night air fills your lungs... tall dark branches loom overhead.';
        this.subtitleText.classList.add('visible');
        break;

      case PHASES.FOREST_WALK:
        this.eyelidsOverlay.classList.add('fully-open');
        if (visionBlur) visionBlur.classList.add('cleared');
        this.walkControlsHud.classList.add('visible');
        this.subtitleText.textContent = 'Follow the winding path ahead into the dark woods...';
        break;

      case PHASES.DOOR_APPROACH:
        this.walkControlsHud.classList.remove('visible');
        this.subtitleText.textContent = 'An isolated cabin stands in the mist...';
        break;

      case PHASES.DOOR_SLAM_BATS:
        this.subtitleText.textContent = 'A sudden disturbance!';
        break;

      case PHASES.ENTERING_CABIN:
        this.subtitleText.textContent = 'Entering the weathered cabin...';
        break;

      case PHASES.TABLE_REVEAL:
        this.subtitleText.textContent = 'An antique Ouija board lies under flickering candlelight.';
        break;

      case PHASES.BOARD_APPROACH:
        this.subtitleText.textContent = 'Approaching the board...';
        break;

      case PHASES.TRANSITION_INTERACTIVE:
      case PHASES.INTERACTIVE:
        this.walkControlsHud.classList.remove('visible');
        this.subtitleText.textContent = 'The spirits await. Drag the planchette or whisper a question.';
        this.ouijaUi.classList.add('visible');
        this.skipIntroBtn.style.display = 'none';
        this.replayIntroBtn.style.display = 'block';
        break;
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(0.1, this.clock.getDelta());
    const clockTime = this.clock.getElapsedTime();

    // Update systems
    this.forest.update(delta, clockTime);
    this.cabin.update(delta, clockTime);
    this.bats.update(delta, clockTime);
    const planchetteSpeed = this.ouija.update(delta, clockTime);
    if (planchetteSpeed > 0.08) {
      this.sound.playPlanchetteSlide();
    }
    this.spiritEngine.update(delta);
    this.timeline.update(delta, clockTime);

    this.sceneManager.render();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
