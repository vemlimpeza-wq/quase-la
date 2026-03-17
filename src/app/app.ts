import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { GoogleGenAI } from '@google/genai';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  showAdminModal = signal(false);
  prompt = signal('Um sofá limpo e brilhante, estilo realista, cores azul e branco');
  generatedImage = signal<string | null>(null);
  isGenerating = signal(false);
  error = signal<string | null>(null);

  async generateImage() {
    if (!this.prompt()) return;
    
    this.isGenerating.set(true);
    this.error.set(null);
    this.generatedImage.set(null);

    try {
      const w = window as any;
      if (w.aistudio && typeof w.aistudio.hasSelectedApiKey === 'function') {
         const hasKey = await w.aistudio.hasSelectedApiKey();
         if (!hasKey) {
           await w.aistudio.openSelectKey();
         }
      }

      const apiKey = (typeof process !== 'undefined' && process.env && process.env['API_KEY']) 
                     ? process.env['API_KEY'] 
                     : (typeof GEMINI_API_KEY !== 'undefined' ? GEMINI_API_KEY : '');

      const aiClient = new GoogleGenAI({ apiKey });

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [
            { text: this.prompt() }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: "3:4",
            imageSize: "1K"
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          this.generatedImage.set(`data:image/png;base64,${base64EncodeString}`);
          break;
        }
      }
      
      this.showAdminModal.set(false);
    } catch (err: any) {
      console.error(err);
      this.error.set(err.message || 'Erro ao gerar imagem');
      if (err.message?.includes('Requested entity was not found')) {
        const w = window as any;
        if (w.aistudio && typeof w.aistudio.openSelectKey === 'function') {
           await w.aistudio.openSelectKey();
        }
      }
    } finally {
      this.isGenerating.set(false);
    }
  }
}
