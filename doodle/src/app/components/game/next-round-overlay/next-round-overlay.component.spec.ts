import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NextRoundOverlayComponent } from './next-round-overlay.component';

describe('NextRoundOverlayComponent', () => {
  let component: NextRoundOverlayComponent;
  let fixture: ComponentFixture<NextRoundOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NextRoundOverlayComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NextRoundOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
