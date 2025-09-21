import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Volume2, VolumeX, Eye, Type, Palette, MousePointer, BookOpen } from "lucide-react";

interface AccessibilitySettings {
  fontSize: number;
  highContrast: boolean;
  textToSpeech: boolean;
  visualGuides: boolean;
  simpleMode: boolean;
}

export function AccessibilityButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<AccessibilitySettings>({
    fontSize: 100,
    highContrast: false,
    textToSpeech: false,
    visualGuides: false,
    simpleMode: false,
  });
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Apply accessibility settings to the document
  useEffect(() => {
    const root = document.documentElement;
    
    // Font size adjustment
    root.style.fontSize = `${settings.fontSize}%`;
    
    // High contrast mode
    if (settings.highContrast) {
      root.classList.add('accessibility-high-contrast');
    } else {
      root.classList.remove('accessibility-high-contrast');
    }
    
    // Visual guides
    if (settings.visualGuides) {
      root.classList.add('accessibility-visual-guides');
    } else {
      root.classList.remove('accessibility-visual-guides');
    }
    
    // Simple mode
    if (settings.simpleMode) {
      root.classList.add('accessibility-simple-mode');
    } else {
      root.classList.remove('accessibility-simple-mode');
    }
  }, [settings]);

  // Text-to-Speech functionality
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 0.8;
      utterance.pitch = 1;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleTextToSpeech = () => {
    const newValue = !settings.textToSpeech;
    setSettings(prev => ({ ...prev, textToSpeech: newValue }));
    
    if (newValue) {
      speakText("Lectura de texto activada. Haga clic en cualquier texto para escucharlo.");
    } else {
      stopSpeaking();
    }
  };

  // Handle text-to-speech clicks
  useEffect(() => {
    const handleTextClick = (e: MouseEvent) => {
      if (settings.textToSpeech && e.target instanceof HTMLElement) {
        const text = e.target.textContent || e.target.innerText;
        if (text && text.trim().length > 0) {
          speakText(text.trim());
        }
      }
    };

    if (settings.textToSpeech) {
      document.addEventListener('click', handleTextClick);
    }

    return () => {
      document.removeEventListener('click', handleTextClick);
    };
  }, [settings.textToSpeech]);

  const increaseFontSize = () => {
    setSettings(prev => ({ 
      ...prev, 
      fontSize: Math.min(150, prev.fontSize + 10) 
    }));
  };

  const decreaseFontSize = () => {
    setSettings(prev => ({ 
      ...prev, 
      fontSize: Math.max(80, prev.fontSize - 10) 
    }));
  };

  const resetSettings = () => {
    setSettings({
      fontSize: 100,
      highContrast: false,
      textToSpeech: false,
      visualGuides: false,
      simpleMode: false,
    });
    stopSpeaking();
  };

  return (
    <>
      <div className="accessibility-button-container">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              className="accessibility-button"
              size="sm"
              aria-label="Abrir opciones de accesibilidad"
              data-testid="button-accessibility"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 7.5V9H9V7L3 7.5V9C3 10.1 3.9 11 5 11V17C5 18.1 5.9 19 7 19H9C10.1 19 11 18.1 11 17V14H13V17C13 18.1 13.9 19 15 19H17C18.1 19 19 18.1 19 17V11C20.1 11 21 10.1 21 9Z"
                  fill="currentColor"
                />
              </svg>
            </Button>
          </DialogTrigger>
          <DialogContent className="accessibility-panel" aria-describedby="accessibility-description">
            <DialogHeader>
              <DialogTitle>Opciones de Accesibilidad</DialogTitle>
              <p id="accessibility-description" className="text-sm text-muted-foreground">
                Ajuste la interfaz según sus necesidades de accesibilidad
              </p>
            </DialogHeader>

            <div className="accessibility-controls space-y-6">
              {/* Text Size Controls */}
              <div className="accessibility-section">
                <h3 className="accessibility-section-title">
                  <Type className="w-4 h-4" />
                  Tamaño de Texto
                </h3>
                <div className="accessibility-controls-row">
                  <Button
                    onClick={decreaseFontSize}
                    variant="outline"
                    size="sm"
                    disabled={settings.fontSize <= 80}
                    aria-label="Disminuir tamaño de texto"
                    data-testid="button-decrease-font"
                  >
                    A-
                  </Button>
                  <Badge variant="secondary" className="accessibility-font-indicator">
                    {settings.fontSize}%
                  </Badge>
                  <Button
                    onClick={increaseFontSize}
                    variant="outline"
                    size="sm"
                    disabled={settings.fontSize >= 150}
                    aria-label="Aumentar tamaño de texto"
                    data-testid="button-increase-font"
                  >
                    A+
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Contrast Controls */}
              <div className="accessibility-section">
                <h3 className="accessibility-section-title">
                  <Palette className="w-4 h-4" />
                  Contraste y Visibilidad
                </h3>
                <div className="accessibility-controls-row">
                  <Button
                    onClick={() => setSettings(prev => ({ ...prev, highContrast: !prev.highContrast }))}
                    variant={settings.highContrast ? "default" : "outline"}
                    size="sm"
                    className="accessibility-toggle-button"
                    aria-label={settings.highContrast ? "Desactivar alto contraste" : "Activar alto contraste"}
                    data-testid="button-high-contrast"
                  >
                    {settings.highContrast ? "Alto Contraste ON" : "Alto Contraste OFF"}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Text-to-Speech Controls */}
              <div className="accessibility-section">
                <h3 className="accessibility-section-title">
                  <Volume2 className="w-4 h-4" />
                  Lectura de Pantalla
                </h3>
                <div className="accessibility-controls-row">
                  <Button
                    onClick={toggleTextToSpeech}
                    variant={settings.textToSpeech ? "default" : "outline"}
                    size="sm"
                    className="accessibility-toggle-button"
                    aria-label={settings.textToSpeech ? "Desactivar lectura de texto" : "Activar lectura de texto"}
                    data-testid="button-text-to-speech"
                  >
                    {settings.textToSpeech ? (
                      <>
                        <Volume2 className="w-4 h-4 mr-2" />
                        Lectura ON
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-4 h-4 mr-2" />
                        Lectura OFF
                      </>
                    )}
                  </Button>
                  {isSpeaking && (
                    <Button
                      onClick={stopSpeaking}
                      variant="destructive"
                      size="sm"
                      aria-label="Detener lectura"
                      data-testid="button-stop-speech"
                    >
                      Detener
                    </Button>
                  )}
                </div>
                {settings.textToSpeech && (
                  <p className="accessibility-help-text">
                    Haga clic en cualquier texto para escucharlo
                  </p>
                )}
              </div>

              <Separator />

              {/* Visual Guides */}
              <div className="accessibility-section">
                <h3 className="accessibility-section-title">
                  <MousePointer className="w-4 h-4" />
                  Guías Visuales
                </h3>
                <div className="accessibility-controls-row">
                  <Button
                    onClick={() => setSettings(prev => ({ ...prev, visualGuides: !prev.visualGuides }))}
                    variant={settings.visualGuides ? "default" : "outline"}
                    size="sm"
                    className="accessibility-toggle-button"
                    aria-label={settings.visualGuides ? "Desactivar guías visuales" : "Activar guías visuales"}
                    data-testid="button-visual-guides"
                  >
                    {settings.visualGuides ? "Guías ON" : "Guías OFF"}
                  </Button>
                </div>
                {settings.visualGuides && (
                  <p className="accessibility-help-text">
                    Enlaces subrayados y campos con bordes resaltados
                  </p>
                )}
              </div>

              <Separator />

              {/* Simple Mode */}
              <div className="accessibility-section">
                <h3 className="accessibility-section-title">
                  <BookOpen className="w-4 h-4" />
                  Modo Simple
                </h3>
                <div className="accessibility-controls-row">
                  <Button
                    onClick={() => setSettings(prev => ({ ...prev, simpleMode: !prev.simpleMode }))}
                    variant={settings.simpleMode ? "default" : "outline"}
                    size="sm"
                    className="accessibility-toggle-button"
                    aria-label={settings.simpleMode ? "Desactivar modo simple" : "Activar modo simple"}
                    data-testid="button-simple-mode"
                  >
                    {settings.simpleMode ? "Modo Simple ON" : "Modo Simple OFF"}
                  </Button>
                </div>
                {settings.simpleMode && (
                  <p className="accessibility-help-text">
                    Textos e instrucciones simplificadas
                  </p>
                )}
              </div>

              <Separator />

              {/* Reset Button */}
              <div className="accessibility-section">
                <Button
                  onClick={resetSettings}
                  variant="outline"
                  size="sm"
                  className="w-full"
                  aria-label="Restaurar configuración por defecto"
                  data-testid="button-reset-accessibility"
                >
                  Restaurar Configuración
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}