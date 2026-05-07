import React, { useState, useEffect } from 'react';
import './TutorialModal.css';

interface TutorialStep {
  title: string;
  content: string;
  highlight?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Welcome to Open Arms! 🏠",
    content: "You are the manager of a homeless shelter. Your goal is to help residents rebuild their lives by providing shelter, food, and opportunities for growth."
  },
  {
    title: "Understanding the HUD 📊",
    content: "The top bar shows your key metrics: Money (💰), Reputation (⭐), Resident Count (👥), and Current Day. Keep an eye on these!"
  },
  {
    title: "Building Rooms 🏗️",
    content: "Click the 'Build' button (or press B) to enter build mode. You'll need Dormitories for sleeping, Cafeterias for food, and Learning Centers to help residents graduate."
  },
  {
    title: "Managing Residents 👥",
    content: "Residents have needs: sleep, food, bathroom, learning, and social. They'll automatically seek out rooms to satisfy these needs. Keep them happy!"
  },
  {
    title: "The LIFE Meter 📈",
    content: "Each resident has a LIFE meter that fills as they use Learning Centers or Vocational Rooms. When it reaches 100%, they graduate and you earn reputation!"
  },
  {
    title: "Money & Donations 💰",
    content: "You receive donations every 5 minutes based on your resident count and reputation. You can also run fundraisers for extra income!"
  },
  {
    title: "Day & Night Cycle 🌓",
    content: "The shelter operates on a day/night cycle. Some rooms close at night. Residents need to sleep during the night phase."
  },
  {
    title: "Random Events 🎯",
    content: "Random events will occur that require your decision. Choose wisely - your choices affect money, reputation, and residents!"
  },
  {
    title: "Keyboard Shortcuts ⌨️",
    content: "Press B for Build Menu, M for Management Panel, Space to Pause, S to Save, and Esc to close modals. Check Settings for more!"
  },
  {
    title: "Ready to Begin! 🎮",
    content: "Start by building a Dormitory, Cafeteria, and Bathroom. Then add a Learning Center to help residents progress. Good luck!"
  }
];

interface TutorialModalProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function TutorialModal({ onComplete, onSkip }: TutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const step = TUTORIAL_STEPS[currentStep];
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;
  
  return (
    <div className="modal-overlay">
      <div className="modal tutorial-modal">
        <div className="tutorial-header">
          <h2>{step.title}</h2>
          <button className="skip-btn" onClick={onSkip}>
            Skip Tutorial
          </button>
        </div>
        
        <div className="tutorial-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="progress-text">
            Step {currentStep + 1} of {TUTORIAL_STEPS.length}
          </span>
        </div>
        
        <div className="tutorial-content">
          <p>{step.content}</p>
        </div>
        
        <div className="tutorial-actions">
          <button 
            className="btn-secondary"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            ← Previous
          </button>
          
          <button 
            className="btn-primary"
            onClick={handleNext}
          >
            {currentStep < TUTORIAL_STEPS.length - 1 ? 'Next →' : 'Start Playing!'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage tutorial state
 */
export function useTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  
  useEffect(() => {
    const completed = localStorage.getItem('tutorialCompleted');
    if (completed === 'true') {
      setTutorialCompleted(true);
    } else {
      setShowTutorial(true);
    }
  }, []);
  
  const completeTutorial = () => {
    localStorage.setItem('tutorialCompleted', 'true');
    setTutorialCompleted(true);
    setShowTutorial(false);
  };
  
  const skipTutorial = () => {
    localStorage.setItem('tutorialCompleted', 'true');
    setTutorialCompleted(true);
    setShowTutorial(false);
  };
  
  const resetTutorial = () => {
    localStorage.removeItem('tutorialCompleted');
    setTutorialCompleted(false);
    setShowTutorial(true);
  };
  
  return {
    showTutorial,
    tutorialCompleted,
    completeTutorial,
    skipTutorial,
    resetTutorial
  };
}
