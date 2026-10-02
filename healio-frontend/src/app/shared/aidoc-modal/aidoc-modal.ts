import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  time: string;
  suggestedSpecialty?: string;
}

@Component({
  selector: 'app-aidoc-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './aidoc-modal.html',
  styleUrl: './aidoc-modal.css'
})
export class AidocModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() bookSpecialty = new EventEmitter<string>();

  userInput = signal<string>('');
  isThinking = signal<boolean>(false);

  messages = signal<ChatMessage[]>([
    {
      sender: 'ai',
      text: 'Hello! I am AIDoc, your Healio clinical triage assistant. Describe your symptoms or ask a health question to get started.',
      time: 'Just now'
    }
  ]);

  quickPrompts = signal<string[]>([
    'Persistent dry cough & fever',
    'Severe lower back pain',
    'Skin rash with itching',
    'Acidity & stomach bloating'
  ]);

  sendMessage(textToSend?: string) {
    const text = (textToSend || this.userInput()).trim();
    if (!text) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    this.messages.update(prev => [...prev, { sender: 'user', text, time }]);
    this.userInput.set('');
    this.isThinking.set(true);

    setTimeout(() => {
      const q = text.toLowerCase();
      let reply = 'Thank you for sharing. A verified doctor should review your symptoms for an accurate treatment plan.';
      let spec = 'General Physician';

      if (q.includes('fever') || q.includes('cough') || q.includes('cold')) {
        reply = 'These symptoms often indicate an upper respiratory infection. Stay hydrated and track your temperature.';
        spec = 'General Physician';
      } else if (q.includes('skin') || q.includes('rash') || q.includes('itch')) {
        reply = 'Dermatological symptoms require direct examination to avoid misusing topical steroids.';
        spec = 'Dermatologist';
      } else if (q.includes('back') || q.includes('bone') || q.includes('joint')) {
        reply = 'Persistent musculoskeletal pain may stem from strain or alignment issues.';
        spec = 'Orthopedic Surgeon';
      }

      this.messages.update(prev => [
        ...prev,
        { sender: 'ai', text: reply, time, suggestedSpecialty: spec }
      ]);
      this.isThinking.set(false);
    }, 800);
  }

  onSelectSpecialty(specialty: string) {
    this.bookSpecialty.emit(specialty);
    this.close.emit();
  }
}