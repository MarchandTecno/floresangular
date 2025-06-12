import { Component, OnInit, ElementRef, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, AfterViewInit {
  title = 'flores-animadas';
  private audioPlayer!: HTMLAudioElement;
  animationStarted: boolean = false; // Controla si la animación ya inició

  constructor(private elementRef: ElementRef) {}

  ngOnInit() {
    const audioEl = document.getElementById('backgroundAudio');
    if (audioEl instanceof HTMLAudioElement) {
      this.audioPlayer = audioEl;
    } else {
      console.error('No se pudo encontrar el elemento de audio con ID "backgroundAudio" o no es un elemento de audio.');
    }
  }

  ngAfterViewInit() {
    // Añade un event listener al documento para capturar la primera interacción
    document.addEventListener('click', this.handleInitialInteraction.bind(this), { once: true });
    document.addEventListener('touchstart', this.handleInitialInteraction.bind(this), { once: true }); // Para toques en móvil
  }

  // Esta función se llamará cuando el usuario interactúe por primera vez
  handleInitialInteraction() {
    if (!this.animationStarted) {
      this.startAnimationAndMusic();
      this.animationStarted = true;
    }
  }

  startAnimationAndMusic() {
    // **Importante:** Aquí necesitas una forma de comunicar a FlowerCanvasComponent
    // que la animación debe iniciar. Una forma es modificar el estado de animationPaused
    // en FlowerCanvasComponent. Podríamos usar un servicio para esto,
    // o hacer que FlowerCanvasComponent también escuche por un evento global si no quieres
    // acoplar tanto los componentes.

    // Por ahora, como FlowerCanvasComponent ya escucha `p.touchStarted` / `p.mousePressed`,
    // que a su vez llama `checkOrientation` para despausar la animación,
    // NO necesitamos añadir lógica de inicio de animación aquí para el canvas.
    // Solo necesitamos iniciar el audio.

    if (this.audioPlayer) {
      this.audioPlayer.play()
        .then(() => {
          console.log('Música iniciada correctamente.');
        })
        .catch(error => {
          console.warn('Fallo al reproducir la música. El navegador podría estar bloqueándolo. Error:', error);
        });
    }
  }
}