import React, { useState, useEffect } from 'react';
import { X, MousePointer, RotateCcw, RotateCw, Plus, MessageCircle } from 'lucide-react';

interface TutorialOverlayProps {
  isVisible: boolean;
  onClose: () => void;
}

const TutorialOverlay = ({ isVisible, onClose }: TutorialOverlayProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Welcome to Soodo Code!",
      content: "Visual programming made simple. Create flowcharts that generate real code.",
      icon: MousePointer,
      position: "center"
    },
    {
      title: "Add Nodes",
      content: "Shift+Click anywhere on the canvas to add different types of nodes. Try it now!",
      icon: Plus,
      position: "canvas"
    },
    {
      title: "Undo & Redo",
      content: "Use the toolbar at the bottom to undo/redo your actions. Keyboard: Ctrl+Z / Ctrl+Y",
      icon: RotateCcw,
      position: "toolbar"
    },
    {
      title: "AI Assistant",
      content: "Click the AI Assistant button to get intelligent help and generate code!",
      icon: MessageCircle,
      position: "assistant"
    }
  ];

  if (!isVisible) return null;

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-soodo-cocoa-brown bg-opacity-10 rounded-full flex items-center justify-center">
            <Icon size={32} className="text-soodo-cocoa-brown" />
          </div>
        </div>

        {/* Content */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            {currentStepData.title}
          </h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            {currentStepData.content}
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center mb-6">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full mx-1 transition-colors ${
                index === currentStep ? 'bg-soodo-cocoa-brown' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <button
            onClick={handleSkip}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Skip Tutorial
          </button>
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-soodo-cocoa-brown text-white rounded-lg hover:bg-opacity-90 transition-colors"
          >
            {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;