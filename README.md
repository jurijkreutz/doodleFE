# Doodle Frontend
This is the frontend for the (currently named) Doodle game. In this game, one user draws something while the others try to guess what is being drawn. This frontend communicates with the [Doodle Backend](https://github.com/jurijkreutz/doodleBE).

## How to Run
To run the Doodle Frontend, ensure you have **Node.js** installed, along with the **Angular CLI**. If Angular CLI is not installed, you can install it globally by running:
```npm install -g @angular/cli```

Once installed, navigate to the project folder, open a terminal, and run the following command:
```ng serve```

This will compile the project and start a development server, typically accessible at `http://localhost:4200`.

## Development Stage
### Features That Already Work

- Users can enter a name
- Users can create a lobby or join by ID
- Users can chat in the lobby and start a game
- The original lobby creator (OP) can draw, and other users can guess

### Features in Development

- Word system: Implementing words for players to guess
- Score system
- Game settings: Users should be able to set game rounds, etc.
- When a user guesses correctly, the next player should draw
- Improved user interface for better user management
