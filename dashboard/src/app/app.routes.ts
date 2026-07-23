import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'overview',
    title: 'Overview · Transaction Intelligence',
    loadComponent: () =>
      import('./features/overview/overview').then((component) => component.Overview),
  },
  {
    path: 'behavior',
    title: 'Banking activity over time · Transaction Intelligence',
    loadComponent: () =>
      import('./features/behavior/behavior').then((component) => component.Behavior),
  },
  {
    path: 'segments',
    title: 'Customer segmentation · Transaction Intelligence',
    loadComponent: () =>
      import('./features/segments/segments').then((component) => component.Segments),
  },
  {
    path: 'validation',
    title: 'Validation and insights · Transaction Intelligence',
    loadComponent: () =>
      import('./features/validation/validation').then((component) => component.Validation),
  },
  {
    path: 'about',
    title: 'About the project · Transaction Intelligence',
    loadComponent: () => import('./features/about/about').then((component) => component.About),
  },
  { path: '', pathMatch: 'full', redirectTo: 'overview' },
  { path: '**', redirectTo: 'overview' },
];
