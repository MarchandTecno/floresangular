// flower-canvas.component.ts
import { Component, OnInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import p5 from 'p5';

@Component({
  selector: 'app-flower-canvas',
  standalone: true,
  templateUrl: './flower-canvas.component.html',
  styleUrls: ['./flower-canvas.component.css']
})
export class FlowerCanvasComponent implements OnInit, OnDestroy {
  @ViewChild('flowerCanvas', { static: true })
  canvasRef!: ElementRef;

  private p5Instance: p5 | undefined;
  private flowers: any[] = [];
  private maxFlowers: number = 150;
  private animationDuration: number = 420; // Flores terminan de aparecer en 7 segundos
  private messageDelay: number = 300;     // Mensaje empieza a aparecer a los 5 segundos
  private currentFrame: number = 0;

  private animationFinished: boolean = false;
  private messageShown: boolean = false;
  private petals: any[] = [];

  // --- NUEVAS VARIABLES DE ESTADO ---
  private animationPaused: boolean = true; // Empieza pausada
  private showOrientationMessage: boolean = false;
  private isMobile: boolean = false;
  private hasInteracted: boolean = false; // CORRECCIÓN: 'boolean = boolean = false;' se cambió a 'boolean = false;'
  // --- FIN NUEVAS VARIABLES DE ESTADO ---


  constructor() { }

  ngOnInit(): void {
    this.p5Instance = new p5(this.sketch.bind(this), this.canvasRef.nativeElement);
  }

  ngOnDestroy(): void {
    if (this.p5Instance) {
      this.p5Instance.remove();
    }
  }

  private sketch(p: p5): void {
    p.setup = () => {
      const canvas = p.createCanvas(p.windowWidth * 0.8, p.windowHeight * 0.8);
      canvas.parent(this.canvasRef.nativeElement);
      p.background(210, 180, 230); // Fondo Malva Sutil
      p.angleMode(p.DEGREES);
      p.ellipseMode(p.RADIUS);

      // --- Detección inicial de dispositivo y orientación ---
      // Heurística simple para detectar móvil. p.width es el ancho del canvas.
      this.isMobile = p.width < 600 || p.height < 600;
      this.checkOrientation(p);
      // --- FIN Detección inicial ---
    };

    p.draw = () => {
      // --- Lógica de la pantalla de orientación/carga ---
      p.background(210, 180, 230); // Limpia siempre el fondo

      if (this.animationPaused) {
        this.drawOverlayMessage(p);
        return; // Detiene el resto del bucle de dibujo
      }
      // --- FIN Lógica de la pantalla de orientación/carga ---

      this.currentFrame = p.frameCount; // Solo avanza frames si no está pausada

      if (!this.animationFinished) {
        if (this.flowers.length < this.maxFlowers) {
          if (p.frameCount % 1 === 0) { // Añade una nueva flor en cada frame
            this.generateRandomFlower(p);
          }
        } else {
          if (this.currentFrame >= this.animationDuration) {
            this.animationFinished = true;
          }
        }
      }

      // Dibuja y anima cada flor existente
      for (let i = 0; i < this.flowers.length; i++) {
        const flower = this.flowers[i];
        p.push();
        p.translate(flower.x, flower.y);
        p.rotate(flower.rotation + p.frameCount * flower.rotationSpeed);

        let appearScale = p.constrain(p.map(this.currentFrame, flower.birthFrame, flower.birthFrame + 90, 0, 1), 0, 1);
        p.scale(appearScale);

        // Interactividad: hacer que las flores giren más rápido cerca del ratón/dedo
        if (p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height) {
          let distance = p.dist(flower.x, flower.y, p.mouseX, p.mouseY);
          if (distance < 100) {
            p.rotate(p.map(distance, 0, 100, 0, 15));
          }
        }

        if (flower.type === 'daisy') {
          this.drawDaisy(p, flower.size, flower.color.r, flower.color.g, flower.color.b);
        } else {
          this.drawRose(p, flower.size, flower.color.r, flower.color.g, flower.color.b);
        }
        p.pop();
      }

      // Filtra los pétalos que han muerto (su vida es <= 0)
      this.petals = this.petals.filter(petal => petal.life > 0);

      // Dibuja los pétalos generados por el ratón/dedo
      for (let i = 0; i < this.petals.length; i++) {
        const petal = this.petals[i];
        p.push();
        p.translate(petal.x, petal.y);
        p.rotate(petal.rotation + p.frameCount * petal.rotationSpeed); // Anima los pétalos un poco
        p.scale(petal.scale);

        // Actualiza la vida y la transparencia del pétalo
        petal.life -= 1; // Disminuye la vida en cada frame
        petal.alpha = p.map(petal.life, 0, petal.initialLife, 0, 255); // Mapea la vida a la transparencia

        if (petal.type === 'daisy') {
          this.drawDaisyPetal(p, petal.size, petal.color.r, petal.color.g, petal.color.b, petal.alpha);
        } else {
           this.drawRosePetal(p, petal.size, petal.color.r, petal.color.g, petal.color.b, petal.alpha);
        }
        p.pop();
      }

      // Lógica para mostrar el mensaje principal
      if (this.currentFrame > this.messageDelay && this.animationFinished && !this.messageShown) {
        this.messageShown = true;
      }

      if (this.messageShown) {
        this.drawMessage(p);
      }
    };

    // --- Eventos para interacción y orientación ---
    p.mouseMoved = () => {
      // Solo genera pétalos si la animación NO está pausada y el ratón está dentro del canvas
      if (!this.animationPaused && p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height) {
        if (p.frameCount % 2 === 0) { // Limita la tasa de generación de pétalos (cada 2 frames)
          this.generateMousePetal(p);
        }
      }
    };

    p.touchMoved = () => { // Para dispositivos móviles (detecta el arrastre del dedo)
      // Solo genera pétalos si la animación NO está pausada y hay al menos un toque
      if (!this.animationPaused && p.touches.length > 0) {
        p.mouseX = (p.touches[0] as any).x; // P5.js actualiza mouseX/Y con la posición del primer toque
        p.mouseY = (p.touches[0] as any).y;
        if (p.frameCount % 2 === 0) {
          this.generateMousePetal(p);
        }
      }
      return false; // Importante: Previene el scroll por defecto en móvil al arrastrar
    };

    p.windowResized = () => { // Se llama al redimensionar la ventana o rotar el dispositivo
      p.resizeCanvas(p.windowWidth * 0.8, p.windowHeight * 0.8);
      this.checkOrientation(p); // Re-chequea la orientación y el estado de pausa
    };

    // Eventos para detectar la primera interacción del usuario y despausar la animación
    p.touchStarted = () => { // Para iniciar la animación al primer toque en móvil
      if (this.animationPaused) {
        this.hasInteracted = true; // Marca que el usuario ya interactuó
        this.checkOrientation(p); // Re-chequea la orientación y despausa si es posible
      }
      return false; // Importante: Previene el zoom por defecto al tocar en móvil
    };

    p.mousePressed = () => { // Para iniciar la animación al primer click del ratón en escritorio
      if (this.animationPaused) {
        this.hasInteracted = true; // Marca que el usuario ya interactuó
        this.checkOrientation(p); // Re-chequea la orientación y despausa si es posible
      }
    };
    // --- FIN Eventos ---
  }

  // --- FUNCIONES PARA LA PANTALLA DE ORIENTACIÓN/CARGA ---
  private checkOrientation(p: p5): void {
      // Si es móvil y está en modo vertical (portrait)
      if (this.isMobile && p.width < p.height) {
          this.showOrientationMessage = true;
          this.animationPaused = true; // La animación permanece pausada
      } else { // Si está en horizontal o no es un dispositivo móvil
          this.showOrientationMessage = false; // No mostrar mensaje de orientación
          // Si el usuario ya interactuó O no es un dispositivo móvil, despausa la animación
          if (this.hasInteracted || !this.isMobile) {
              this.animationPaused = false;
          } else { // Si es móvil, está horizontal, pero aún no ha habido interacción
              this.animationPaused = true; // Sigue pausada esperando el toque
          }
      }
  }

  private drawOverlayMessage(p: p5): void {
      p.fill(210, 180, 230, 220); // Fondo semi-transparente del color del lienzo
      p.rect(0, 0, p.width, p.height);

      p.textAlign(p.CENTER, p.CENTER);
      p.fill(50, 50, 50); // Color de texto

      if (this.showOrientationMessage) { // Mensaje para girar el celular
          p.textSize(p.width * 0.05);
          p.text("Por favor, gira tu celular\na horizontal para una mejor experiencia", p.width / 2, p.height / 2 - p.width * 0.08);
          p.textSize(p.width * 0.03);
          p.text("(Y toca la pantalla para iniciar)", p.width / 2, p.height / 2 + p.width * 0.02);
      } else if (this.isMobile && !this.hasInteracted) { // Mensaje para tocar la pantalla en horizontal (móvil)
          p.textSize(p.width * 0.05);
          p.text("Toca la pantalla para comenzar", p.width / 2, p.height / 2);
      } else {
          // Esto no debería ejecutarse con la lógica actual si animationPaused es true
          // Pero podría usarse para un mensaje de "Cargando..."
          p.textSize(p.width * 0.04);
          p.text("Preparando la magia...", p.width / 2, p.height / 2);
      }
  }
  // --- FIN FUNCIONES DE LA PANTALLA DE ORIENTACIÓN/CARGA ---


  private generateMousePetal(p: p5): void {
    const type = p.random() > 0.5 ? 'daisy' : 'rose';
    const size = p.random(10, 30);
    let color;
    if (type === 'daisy') {
      color = { r: 255, g: 255, b: 255 };
    } else {
        const roseColors = [
            {r: 255, g: 100, b: 150},
            {r: 200, g: 50, b: 100},
            {r: 150, g: 0, b: 200},
            {r: 255, g: 150, b: 200},
            {r: 180, g: 80, b: 220},
            {r: 255, g: 80, b: 120}
        ];
        color = p.random(roseColors);
    }
    const rotation = p.random(0, 360);
    const rotationSpeed = p.random(-0.1, 0.1);
    const scale = p.random(0.5, 1.0);

    const initialLife = p.random(60, 120); // Pétalos viven entre 1 y 2 segundos
    const alpha = 255; // Empiezan completamente opacos

    this.petals.push({
      type,
      x: p.mouseX,
      y: p.mouseY,
      size,
      rotation,
      rotationSpeed,
      color,
      scale,
      life: initialLife,
      initialLife: initialLife,
      alpha: alpha
    });
  }

  // Dibuja un solo pétalo de margarita
  private drawDaisyPetal(p: p5, size: number, r: number, g: number, b: number, alpha: number): void {
    p.noStroke();
    p.fill(r, g, b, alpha);
    p.ellipse(0, size * 0.3, size * 0.25, size * 0.8);
  }

  // Dibuja un solo pétalo de rosa
  private drawRosePetal(p: p5, size: number, r: number, g: number, b: number, alpha: number): void {
    p.noStroke();
    p.fill(r, g, b, alpha);
    p.ellipse(0, size * 0.1, size * 0.12, size * 0.22);
  }

  private generateRandomFlower(p: p5): void {
    const type = p.random() > 0.4 ? 'rose' : 'daisy';

    let size;
    let color;
    let x, y;

    const ellipseCenterX = p.width / 2;
    const ellipseCenterY = p.height / 2;
    const ellipseHorizontalRadius = p.width * 0.43;
    const ellipseVerticalRadius = p.height * 0.35;

    let attempts = 0;
    const maxAttempts = 150;
    let isInsideEllipse: boolean;

    do {
      x = p.random(p.width * 0.01, p.width * 0.99);
      y = p.random(p.height * 0.01, p.height * 0.99);
      attempts++;

      isInsideEllipse =
        ((x - ellipseCenterX) * (x - ellipseCenterX)) / (ellipseHorizontalRadius * ellipseHorizontalRadius) +
        ((y - ellipseCenterY) * (y - ellipseCenterY)) / (ellipseVerticalRadius * ellipseVerticalRadius) <= 1;

    } while (isInsideEllipse && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      const angleRad = p.random(0, p.TWO_PI);
      const a = ellipseHorizontalRadius;
      const b = ellipseVerticalRadius;
      const radiusAtEllipseEdge = (a * b) / p.sqrt((a * a) * p.pow(p.sin(angleRad), 2) + (b * b) * p.pow(p.cos(angleRad), 2));
      const offset = p.random(10, 40);
      const targetRadius = radiusAtEllipseEdge + offset;
      x = ellipseCenterX + targetRadius * p.cos(angleRad);
      y = ellipseCenterY + targetRadius * p.sin(angleRad);
      x = p.constrain(x, p.width * 0.01, p.width * 0.99);
      y = p.constrain(y, p.height * 0.01, p.height * 0.99);
    }

    if (type === 'daisy') {
      size = p.random(30, 70);
      color = { r: 255, g: 255, b: 255 };
    } else { // Rose
      size = p.random(70, 150);
      const roseColors = [
        { r: 255, g: 100, b: 150 },
        { r: 200, g: 50, b: 100 },
        { r: 150, g: 0, b: 200 },
        { r: 255, g: 150, b: 200 },
        { r: 180, g: 80, b: 220 },
        { r: 255, g: 80, b: 120 }
      ];
      color = p.random(roseColors);
    }

    // --- NUEVO: Ajusta el tamaño de la flor según si es móvil ---
    let sizeMultiplier = 1.0;
    // Si el ancho del canvas es pequeño (asumiendo modo horizontal para móvil)
    // O si nuestra heurística detecta que es móvil
    if (p.width < 768 || this.isMobile) {
        sizeMultiplier = 0.6; // Reduce el tamaño a 60% para móviles
    }
    size *= sizeMultiplier;
    // --- FIN NUEVO ---

    const rotation = p.random(0, 360);
    const rotationSpeed = p.random(-0.05, 0.05);

    this.flowers.push({
      type, x, y, size, rotation, rotationSpeed, color,
      birthFrame: this.currentFrame
    });
  }

  // Dibuja una margarita completa (ya teníamos esta)
  private drawDaisy(p: p5, size: number, r: number, g: number, b: number): void {
    p.noStroke();
    p.fill(r, g, b, 200);
    let numPetals = 20;
    let petalLength = size * 0.8;
    let petalWidth = size * 0.25;

    for (let i = 0; i < 360; i += 360 / numPetals) {
      p.rotate(i);
      p.ellipse(0, size * 0.3, petalWidth, petalLength);
    }
    p.fill(255, 200, 0);
    p.ellipse(0, 0, size * 0.25, size * 0.25);
  }

  // Dibuja una rosa completa (ya teníamos esta)
  private drawRose(p: p5, size: number, r: number, g: number, b: number): void {
    p.noStroke();
    let baseColor = p.color(r, g, b);

    for (let i = 0; i < 5; i++) {
      let darkerColor = p.lerpColor(baseColor, p.color(0, 0, 0), i * 0.15);
      p.fill(darkerColor);

      p.push();
      p.rotate(i * 25);

      for (let j = 0; j < 6; j++) {
        p.rotate(60);
        p.ellipse(0, size * 0.1 * (1 - i * 0.08), size * 0.12, size * 0.22 * (1 - i * 0.08));
      }
      p.pop();
    }
    p.fill(r * 0.8, g * 0.8, b * 0.8);
    p.ellipse(0, 0, size * 0.05, size * 0.05);
  }

  // Dibuja los mensajes
  private drawMessage(p: p5): void {
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(p.width * 0.04);
    p.fill(50, 50, 50);
    p.noStroke();

    let textAlpha = p.map(this.currentFrame, this.messageDelay, this.messageDelay + 120, 0, 255, true);
    p.fill(50, 50, 50, textAlpha);

    // Mensaje principal
    p.push();
    p.fill(0, 0, 0, textAlpha * 0.3);
    p.text("¡Te amo!", p.width / 2 + 2, p.height / 2 + 2 - (p.width * 0.04));
    p.pop();
    p.fill(50, 50, 50, textAlpha);
    p.text("¡Te amo!", p.width / 2, p.height / 2 - (p.width * 0.04));

    // Segundo mensaje
    p.textSize(p.width * 0.03);
    p.fill(70, 70, 70, textAlpha);
    p.text("¡Cada flor es un pedacito de mi corazón para ti!", p.width / 2, p.height / 2 + (p.width * 0.01));

    // Mensaje interactivo
    p.textSize(p.width * 0.02);
    p.fill(100, 100, 100, textAlpha * 0.8);
    p.text("Mueve el dedo o ratón para ver la magia...", p.width / 2, p.height / 2 + (p.width * 0.01) + (p.width * 0.05));

    // Mensaje final
    p.textSize(p.width * 0.02);
    p.fill(100, 100, 100, textAlpha * 0.8);
    p.text("Para mi SpaceCowgirl;)", p.width / 2, p.height / 6 + (p.width * 0.01) + (p.width * 0.05));
  }
}
