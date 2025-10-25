import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoachDashboard } from './coach-dashboard';

describe('CoachDashboard', () => {
  let component: CoachDashboard;
  let fixture: ComponentFixture<CoachDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoachDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CoachDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
