import { Routes } from '@angular/router';
import {MenuComponent} from "./components/menu/menu.component";
import {LobbyComponent} from "./components/lobby/lobby.component";
import {GameComponent} from "./components/game/game.component";

export const routes: Routes = [
  {
    path: 'menu',
    component: MenuComponent
  },
  {
    path: 'lobby/:id',
    component: LobbyComponent
  },
  {
    path: 'game/:id',
    component: GameComponent
  },
  {
    path: '**',
    redirectTo: 'menu'
  }
];
