import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'ti-about',
  templateUrl: './about.html',
  styleUrl: './about.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class About {}
