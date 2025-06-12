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
  private animationDuration: number = 420;
  private messageDelay: number = 300;
  private currentFrame: number = 0;

  private animationFinished: boolean = false;
  private messageShown: boolean = false;
  private petals: any[] = [];

  // --- NUEVAS VARIABLES DE ESTADO ---
  private animationPaused: boolean = true; // Empieza pausada
  private showOrientationMessage: boolean = false;
  private isMobile: boolean = false;
  private hasInteracted: boolean = false; // Para saber si el usuario ya tocó la pantalla
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
      p.background(210, 180, 230);
      p.angleMode(p.DEGREES);
      p.ellipseMode(p.RADIUS);

      // --- Detección inicial de dispositivo y orientación ---
      this.isMobile = p.width < 600 || p.height < 600; // Heurística simple para detectar móvil
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
          if (p.frameCount % 1 === 0) {
            this.generateRandomFlower(p);
          }
        } else {
          if (this.currentFrame >= this.animationDuration) {
            this.animationFinished = true;
          }
        }
      }

      for (let i = 0; i < this.flowers.length; i++) {
        const flower = this.flowers[i];
        p.push();
        p.translate(flower.x, flower.y);
        p.rotate(flower.rotation + p.frameCount * flower.rotationSpeed);

        let appearScale = p.constrain(p.map(this.currentFrame, flower.birthFrame, flower.birthFrame + 90, 0, 1), 0, 1);
        p.scale(appearScale);

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

      this.petals = this.petals.filter(petal => petal.life > 0);

      for (let i = 0; i < this.petals.length; i++) {
        const petal = this.petals[i];
        p.push();
        p.translate(petal.x, petal.y);
        p.rotate(petal.rotation + p.frameCount * petal.rotationSpeed);
        p.scale(petal.scale);

        petal.life -= 1;
        petal.alpha = p.map(petal.life, 0, petal.initialLife, 0, 255);

        if (petal.type === 'daisy') {
          this.drawDaisyPetal(p, petal.size, petal.color.r, petal.color.g, petal.color.b, petal.alpha);
        } else {
           this.drawRosePetal(p, petal.size, petal.color.r, petal.color.g, petal.color.b, petal.alpha);
        }
        p.pop();
      }

      if (this.currentFrame > this.messageDelay && this.animationFinished && !this.messageShown) {
        this.messageShown = true;
      }

      if (this.messageShown) {
        this.drawMessage(p);
      }
    };

    // --- Eventos para interacción y orientación ---
    p.mouseMoved = () => {
      if (!this.animationPaused && p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height) {
        if (p.frameCount % 2 === 0) {
          this.generateMousePetal(p);
        }
      }
    };

    p.touchMoved = () => { // Para dispositivos móviles
      if (!this.animationPaused && p.touches.length > 0) {
        p.mouseX = (p.touches[0] as any).x; // P5.js actualiza mouseX/Y con el primer toque
        p.mouseY = (p.touches[0] as any).y;
        if (p.frameCount % 2 === 0) {
          this.generateMousePetal(p);
        }
      }
      return false; // Previene el scroll por defecto en móvil
    };

    p.windowResized = () => {
      p.resizeCanvas(p.windowWidth * 0.8, p.windowHeight * 0.8);
      this.checkOrientation(p); // Re-chequea la orientación al redimensionar/rotar
    };

    p.touchStarted = () => { // Para iniciar la animación al primer toque
      if (this.animationPaused) {
        this.hasInteracted = true;
        this.checkOrientation(p); // Re-chequea la orientación
      }
      return false; // Previene el zoom por defecto
    };

    p.mousePressed = () => { // Para iniciar la animación al primer click del ratón
      if (this.animationPaused) {
        this.hasInteracted = true;
        this.checkOrientation(p); // Re-chequea la orientación
      }
    };
    // --- FIN Eventos ---
  }

  // --- NUEVAS FUNCIONES PARA LA PANTALLA DE ORIENTACIÓN/CARGA ---
  private checkOrientation(p: p5): void {
      if (this.isMobile && p.width < p.height) { // Si es móvil y está en modo vertical (portrait)
          this.showOrientationMessage = true;
          this.animationPaused = true;
      } else { // Si es horizontal o no es móvil
          this.showOrientationMessage = false;
          if (this.hasInteracted || !this.isMobile) { // Si ya interactuó o no es móvil, despausa
              this.animationPaused = false;
          } else { // Si es móvil, está horizontal pero no ha interactuado
              this.animationPaused = true; // Sigue pausada esperando el toque
          }
      }
  }

  private drawOverlayMessage(p: p5): void {
      p.fill(210, 180, 230, 220); // Fondo semi-transparente
      p.rect(0, 0, p.width, p.height);

      p.textAlign(p.CENTER, p.CENTER);
      p.fill(50, 50, 50);

      if (this.showOrientationMessage) {
          p.textSize(p.width * 0.05);
          p.text("Por favor, gira tu celular\na horizontal para una mejor experiencia", p.width / 2, p.height / 2 - p.width * 0.08);
          p.textSize(p.width * 0.03);
          p.text("(Y toca la pantalla para iniciar)", p.width / 2, p.height / 2 + p.width * 0.02);
      } else if (this.isMobile && !this.hasInteracted) {
          p.textSize(p.width * 0.05);
          p.text("Toca la pantalla para comenzar", p.width / 2, p.height / 2);
      } else {
          // Esto no debería ocurrir si animationPaused es true y showOrientationMessage es false
          // Podría ser un mensaje de "Cargando..." si tuviéramos assets pesados.
          p.textSize(p.width * 0.04);
          p.text("Preparando la magia...", p.width / 2, p.height / 2);
      }
  }
  // --- FIN NUEVAS FUNCIONES ---


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

    const initialLife = p.random(60, 120);
    const alpha = 255;

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

  private drawDaisyPetal(p: p5, size: number, r: number, g: number, b: number, alpha: number): void {
    p.noStroke();
    p.fill(r, g, b, alpha);
    p.ellipse(0, size * 0.3, size * 0.25, size * 0.8);
  }

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
    } else {
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

    const rotation = p.random(0, 360);
    const rotationSpeed = p.random(-0.05, 0.05);

    this.flowers.push({
      type, x, y, size, rotation, rotationSpeed, color,
      birthFrame: this.currentFrame
    });
  }

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

  private drawMessage(p: p5): void {
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(p.width * 0.04);
    p.fill(50, 50, 50);
    p.noStroke();

    let textAlpha = p.map(this.currentFrame, this.messageDelay, this.messageDelay + 120, 0, 255, true);
    p.fill(50, 50, 50, textAlpha);

    p.push();
    p.fill(0, 0, 0, textAlpha * 0.3);
    p.text("¡Para el amor de mi vida!", p.width / 2 + 2, p.height / 2 + 2 - (p.width * 0.04));
    p.pop();
    p.fill(50, 50, 50, textAlpha);
    p.text("¡Para el amor de mi vida!", p.width / 2, p.height / 2 - (p.width * 0.04));

    p.textSize(p.width * 0.03);
    p.fill(70, 70, 70, textAlpha);
    p.text("¡Cada flor es un pedacito de mi corazón para ti!", p.width / 2, p.height / 2 + (p.width * 0.01));

    p.textSize(p.width * 0.02);
    p.fill(100, 100, 100, textAlpha * 0.8);
    p.text("Mueve el ratón para ver la magia...", p.width / 2, p.height / 2 + (p.width * 0.01) + (p.width * 0.05));
  }
}