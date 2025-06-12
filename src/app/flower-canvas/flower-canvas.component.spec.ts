import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlowerCanvasComponent } from './flower-canvas.component';

describe('FlowerCanvasComponent', () => {
  let component: FlowerCanvasComponent;
  let fixture: ComponentFixture<FlowerCanvasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FlowerCanvasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FlowerCanvasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
