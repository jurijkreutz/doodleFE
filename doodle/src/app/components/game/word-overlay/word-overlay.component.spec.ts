import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WordOverlayComponent } from './word-overlay.component';

describe('WordOverlayComponent', () => {
  let component: WordOverlayComponent;
  let fixture: ComponentFixture<WordOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WordOverlayComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(WordOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
