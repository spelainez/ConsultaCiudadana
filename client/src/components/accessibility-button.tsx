import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Volume2,
  VolumeX,
  Type,
  Palette,
  MousePointer,
  BookOpen,
} from "lucide-react";

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

  useEffect(() => {
    const root = document.documentElement;

    root.style.fontSize = `${settings.fontSize}%`;

    if (settings.highContrast) {
      root.classList.add("accessibility-high-contrast");
    } else {
      root.classList.remove("accessibility-high-contrast");
    }

    if (settings.visualGuides) {
      root.classList.add("accessibility-visual-guides");
    } else {
      root.classList.remove("accessibility-visual-guides");
    }

    if (settings.simpleMode) {
      root.classList.add("accessibility-simple-mode");
    } else {
      root.classList.remove("accessibility-simple-mode");
    }
  }, [settings]);

  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "es-ES";
      utterance.rate = 0.8;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleTextToSpeech = () => {
    setSettings((prev) => ({
      ...prev,
      textToSpeech: !prev.textToSpeech,
    }));

    if (!settings.textToSpeech) {
      speakText(
        "Lectura activada. Haga clic en cualquier texto para escucharlo."
      );
    } else {
      stopSpeaking();
    }
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!settings.textToSpeech) return;
      if (!(e.target instanceof HTMLElement)) return;

      const text = e.target.innerText?.trim();
      if (text) speakText(text);
    };

    if (settings.textToSpeech) {
      document.addEventListener("click", onClick);
    }

    return () => document.removeEventListener("click", onClick);
  }, [settings.textToSpeech]);

  const reset = () => {
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
    <div>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="rounded-full">
            ♿
          </Button>
        </DialogTrigger>

        {/** 👇 CLASE IMPORTANTE PARA EL OVERLAY */}
        <DialogContent className="accessibility-modal-overlay-fix w-[420px]">
          <DialogHeader>
            <DialogTitle>Opciones de Accesibilidad</DialogTitle>
          </DialogHeader>

          {/* TEXT SIZE */}
          <section className="space-y-2">
            <h3 className="font-semibold flex gap-2 items-center">
              <Type size={16} /> Tamaño de texto
            </h3>
            <div className="flex gap-3 items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSettings((p) => ({ ...p, fontSize: Math.max(80, p.fontSize - 10) }))
                }
              >
                A-
              </Button>
              <Badge>{settings.fontSize}%</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSettings((p) => ({ ...p, fontSize: Math.min(150, p.fontSize + 10) }))
                }
              >
                A+
              </Button>
            </div>
          </section>

          <Separator />

          {/* CONTRASTE */}
          <section className="space-y-2">
            <h3 className="font-semibold flex gap-2 items-center">
              <Palette size={16} /> Contraste
            </h3>
            <Button
              size="sm"
              variant={settings.highContrast ? "default" : "outline"}
              onClick={() =>
                setSettings((p) => ({ ...p, highContrast: !p.highContrast }))
              }
            >
              {settings.highContrast ? "Contraste ON" : "Contraste OFF"}
            </Button>
          </section>

          <Separator />

          {/* LECTURA */}
          <section className="space-y-2">
            <h3 className="font-semibold flex gap-2 items-center">
              <Volume2 size={16} /> Lectura de pantalla
            </h3>
            <Button
              size="sm"
              variant={settings.textToSpeech ? "default" : "outline"}
              onClick={toggleTextToSpeech}
            >
              {settings.textToSpeech ? "Lectura ON" : "Lectura OFF"}
            </Button>
            {isSpeaking && (
              <Button variant="destructive" size="sm" onClick={stopSpeaking}>
                Detener
              </Button>
            )}
          </section>

          <Separator />

          {/* GUIAS */}
          <section className="space-y-2">
            <h3 className="font-semibold flex gap-2 items-center">
              <MousePointer size={16} /> Guías Visuales
            </h3>
            <Button
              size="sm"
              variant={settings.visualGuides ? "default" : "outline"}
              onClick={() =>
                setSettings((p) => ({ ...p, visualGuides: !p.visualGuides }))
              }
            >
              {settings.visualGuides ? "Guías ON" : "Guías OFF"}
            </Button>
          </section>

          <Separator />

          {/* SIMPLE */}
          <section className="space-y-2">
            <h3 className="font-semibold flex gap-2 items-center">
              <BookOpen size={16} /> Modo Simple
            </h3>
            <Button
              size="sm"
              variant={settings.simpleMode ? "default" : "outline"}
              onClick={() =>
                setSettings((p) => ({ ...p, simpleMode: !p.simpleMode }))
              }
            >
              {settings.simpleMode ? "Simple ON" : "Simple OFF"}
            </Button>
          </section>

          <Separator />

          <Button variant="outline" size="sm" className="w-full" onClick={reset}>
            Restaurar
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
