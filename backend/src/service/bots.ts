// Bot decision logic. Bots are real players (PlayerState.isBot) dealt hidden roles like
// everyone else; this picks their next action for the current phase. Loyal to their secret
// side: Nawab bots play Success, EIC bots sabotage. Runs server-side (sees full state).

import { teamSize } from '../game/config.js';
import type { Action } from '../game/engine.js';
import { CHARACTER_SIDE, type GameState } from '../game/types.js';

const SPY_CHAPTERS = [2, 3];

/** The next action this bot should take, or null if it has nothing to do right now. */
export function decideBotAction(state: GameState, botId: string): Action | null {
  const me = state.players.find((p) => p.id === botId);
  if (!me || !me.isBot) return null;

  switch (state.status) {
    case 'LOBBY': {
      // A bot only ever becomes host if every human left; then it starts the game.
      const isHost = state.hostId === botId;
      const ready = state.players.length >= 5 && state.players.every((p) => p.ready);
      if (isHost && ready) return { type: 'START_GAME', actorId: botId };
      return null;
    }

    case 'ROLE_REVEAL':
      return me.ackedRole ? null : { type: 'ACK_ROLE', actorId: botId };

    case 'TEAM_PROPOSAL': {
      const leaderId = state.players.find((p) => p.seatIndex === state.shobapotiSeat)?.id;
      if (leaderId !== botId) return null;
      const size = teamSize(state.chapterIndex, state.players.length);
      // Include itself, then fill from the rest in seat order.
      const ordered = [botId, ...state.players.map((p) => p.id).filter((id) => id !== botId)];
      return { type: 'PROPOSE_TEAM', actorId: botId, memberIds: ordered.slice(0, size) };
    }

    case 'VOTING':
      if (state.current && !state.current.votes[botId]) {
        return { type: 'CAST_VOTE', actorId: botId, value: 'YES' };
      }
      return null;

    case 'MISSION': {
      const chapter = state.chapters.find((c) => c.index === state.chapterIndex);
      const onTeam = state.current?.memberIds.includes(botId);
      const submitted = chapter?.cards?.[botId];
      if (onTeam && !submitted) {
        const side = CHARACTER_SIDE[state.roles[botId]!];
        return { type: 'SUBMIT_CARD', actorId: botId, card: side === 'EIC' ? 'BETRAYER' : 'SUCCESS' };
      }
      return null;
    }

    case 'CHAPTER_RESULT': {
      const spyPending =
        !!state.spy &&
        SPY_CHAPTERS.includes(state.chapterIndex) &&
        !state.spy.investigations.some((i) => i.afterChapter === state.chapterIndex);

      // The active spy must investigate before the chapter can advance.
      if (spyPending && state.spy!.currentSpyId === botId) {
        const target = state.players.find(
          (p) => p.id !== botId && !state.spy!.pastSpyIds.includes(p.id),
        );
        if (target) return { type: 'INVESTIGATE', actorId: botId, targetId: target.id };
      }
      // Host bot advances — but only once any pending spy investigation is done.
      if (!spyPending && state.hostId === botId) return { type: 'ADVANCE_CHAPTER', actorId: botId };
      return null;
    }

    case 'FINAL_GUESS': {
      if (state.finalGuess?.mirModonId === botId && !state.finalGuess.targetId) {
        // Guess an EIC-looking player if known, else anyone but itself.
        const target = state.players.find((p) => p.id !== botId);
        if (target) return { type: 'FINAL_GUESS', actorId: botId, targetId: target.id };
      }
      return null;
    }

    default:
      return null;
  }
}
