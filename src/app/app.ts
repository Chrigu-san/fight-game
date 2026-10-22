import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Background } from './shared/components/background/background';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Background],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('Yahu Arena');
}
