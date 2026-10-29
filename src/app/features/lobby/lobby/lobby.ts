import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Online } from '../../../core/services/online';

@Component({
  selector: 'app-lobby',
  imports: [],
  templateUrl: './lobby.html',
  styleUrl: './lobby.scss',
})
export class Lobby {
  private router = inject(Router);
  online = inject(Online);

  nameInput = signal(this.online.name());

  join(event?: Event) {
    event?.preventDefault();
    this.online.connect(this.nameInput());
  }

  back() {
    this.online.disconnect();
    this.router.navigate(['/menu']);
  }

  setName(event: Event) {
    this.nameInput.set((event.target as HTMLInputElement).value);
  }
}
