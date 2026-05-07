/**
 * Audio System for Open Arms
 * Manages background music and sound effects using Web Audio API
 */

export type SoundEffect = 
  | "donation"
  | "graduation"
  | "event"
  | "build"
  | "click"
  | "error"
  | "notification";

export type MusicTrack = "day" | "night";

export interface AudioSettings {
  masterVolume: number;    // 0-1
  musicVolume: number;      // 0-1
  sfxVolume: number;        // 0-1
  muted: boolean;
}

/**
 * Simple tone generator for sound effects
 * Since we don't have audio files, we'll generate simple tones
 */
class ToneGenerator {
  private audioContext: AudioContext | null = null;
  
  constructor() {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext();
    }
  }
  
  /**
   * Play a simple tone
   */
  playTone(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'sine'
  ): void {
    if (!this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.audioContext.currentTime + duration
    );
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }
  
  /**
   * Play a sequence of tones (melody)
   */
  playMelody(notes: { frequency: number; duration: number }[], volume: number): void {
    if (!this.audioContext) return;
    
    let currentTime = this.audioContext.currentTime;
    
    for (const note of notes) {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.value = note.frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(volume, currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        currentTime + note.duration
      );
      
      oscillator.start(currentTime);
      oscillator.stop(currentTime + note.duration);
      
      currentTime += note.duration;
    }
  }
}

/**
 * Audio System Class
 */
export class AudioSystem {
  private settings: AudioSettings;
  private toneGenerator: ToneGenerator;
  private currentMusicTrack: MusicTrack | null = null;
  private musicInterval: number | null = null;
  
  constructor() {
    // Load settings from localStorage
    this.settings = this.loadSettings();
    this.toneGenerator = new ToneGenerator();
  }
  
  /**
   * Load audio settings from localStorage
   */
  private loadSettings(): AudioSettings {
    const saved = localStorage.getItem('audioSettings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load audio settings:', e);
      }
    }
    
    // Default settings
    return {
      masterVolume: 0.7,
      musicVolume: 0.5,
      sfxVolume: 0.7,
      muted: false
    };
  }
  
  /**
   * Save audio settings to localStorage
   */
  private saveSettings(): void {
    localStorage.setItem('audioSettings', JSON.stringify(this.settings));
  }
  
  /**
   * Get current settings
   */
  getSettings(): AudioSettings {
    return { ...this.settings };
  }
  
  /**
   * Update settings
   */
  updateSettings(updates: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...updates };
    this.saveSettings();
  }
  
  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    this.settings.masterVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }
  
  /**
   * Set music volume
   */
  setMusicVolume(volume: number): void {
    this.settings.musicVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }
  
  /**
   * Set SFX volume
   */
  setSFXVolume(volume: number): void {
    this.settings.sfxVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }
  
  /**
   * Toggle mute
   */
  toggleMute(): void {
    this.settings.muted = !this.settings.muted;
    this.saveSettings();
  }
  
  /**
   * Set mute state
   */
  setMuted(muted: boolean): void {
    this.settings.muted = muted;
    this.saveSettings();
  }
  
  /**
   * Calculate effective volume
   */
  private getEffectiveVolume(type: 'music' | 'sfx'): number {
    if (this.settings.muted) return 0;
    
    const typeVolume = type === 'music' ? this.settings.musicVolume : this.settings.sfxVolume;
    return this.settings.masterVolume * typeVolume;
  }
  
  /**
   * Play a sound effect
   */
  playSoundEffect(effect: SoundEffect): void {
    const volume = this.getEffectiveVolume('sfx');
    if (volume === 0) return;
    
    switch (effect) {
      case "donation":
        // Coin sound - ascending tones
        this.toneGenerator.playMelody([
          { frequency: 523.25, duration: 0.1 }, // C5
          { frequency: 659.25, duration: 0.1 }  // E5
        ], volume * 0.3);
        break;
      
      case "graduation":
        // Celebration sound - happy melody
        this.toneGenerator.playMelody([
          { frequency: 523.25, duration: 0.15 }, // C5
          { frequency: 659.25, duration: 0.15 }, // E5
          { frequency: 783.99, duration: 0.15 }, // G5
          { frequency: 1046.50, duration: 0.3 }  // C6
        ], volume * 0.3);
        break;
      
      case "event":
        // Alert sound - attention grabbing
        this.toneGenerator.playMelody([
          { frequency: 880.00, duration: 0.1 },  // A5
          { frequency: 0, duration: 0.05 },      // Pause
          { frequency: 880.00, duration: 0.1 }   // A5
        ], volume * 0.4);
        break;
      
      case "build":
        // Build sound - construction
        this.toneGenerator.playTone(440, 0.15, volume * 0.3, 'square');
        break;
      
      case "click":
        // UI click - short blip
        this.toneGenerator.playTone(800, 0.05, volume * 0.2, 'sine');
        break;
      
      case "error":
        // Error sound - descending tone
        this.toneGenerator.playMelody([
          { frequency: 400, duration: 0.1 },
          { frequency: 300, duration: 0.15 }
        ], volume * 0.3);
        break;
      
      case "notification":
        // Notification - gentle chime
        this.toneGenerator.playMelody([
          { frequency: 659.25, duration: 0.1 }, // E5
          { frequency: 783.99, duration: 0.15 } // G5
        ], volume * 0.25);
        break;
    }
  }
  
  /**
   * Start background music
   */
  startMusic(track: MusicTrack): void {
    if (this.currentMusicTrack === track) return;
    
    this.stopMusic();
    this.currentMusicTrack = track;
    
    // For now, we'll just play a simple ambient tone periodically
    // In a real implementation, you'd load and loop audio files
    const volume = this.getEffectiveVolume('music');
    if (volume === 0) return;
    
    const playAmbient = () => {
      if (this.currentMusicTrack !== track) return;
      
      const baseFreq = track === 'day' ? 220 : 165; // A3 for day, E3 for night
      this.toneGenerator.playTone(baseFreq, 2.0, volume * 0.1, 'sine');
    };
    
    // Play ambient tone every 3 seconds
    playAmbient();
    this.musicInterval = window.setInterval(playAmbient, 3000);
  }
  
  /**
   * Stop background music
   */
  stopMusic(): void {
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    this.currentMusicTrack = null;
  }
  
  /**
   * Update music based on day/night cycle
   */
  updateMusicForPhase(phase: 'day' | 'night'): void {
    this.startMusic(phase);
  }
  
  /**
   * Cleanup
   */
  destroy(): void {
    this.stopMusic();
  }
}

/**
 * Global audio system instance
 */
let audioSystemInstance: AudioSystem | null = null;

/**
 * Get or create audio system instance
 */
export function getAudioSystem(): AudioSystem {
  if (!audioSystemInstance) {
    audioSystemInstance = new AudioSystem();
  }
  return audioSystemInstance;
}

/**
 * Play a sound effect (convenience function)
 */
export function playSFX(effect: SoundEffect): void {
  getAudioSystem().playSoundEffect(effect);
}
