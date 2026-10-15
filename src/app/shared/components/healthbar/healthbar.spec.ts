import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Healthbar } from './healthbar';

describe('Healthbar', () => {
  let component: Healthbar;
  let fixture: ComponentFixture<Healthbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Healthbar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Healthbar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
