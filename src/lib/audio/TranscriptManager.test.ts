/**
 * @file src/lib/audio/TranscriptManager.test.ts
 * @description Unit tests for the TranscriptManager class.
 */
import { describe, it, expect, vi } from 'vitest';
import { TranscriptManager } from './TranscriptManager';
import { preppal } from '~/lib/interview_pb';

describe('TranscriptManager', () => {
  it('should buffer text and emit a complete sentence', () => {
    const onSentence = vi.fn();
    const manager = new TranscriptManager({ onSentence });

    const update1 = preppal.TranscriptUpdate.create({
      speaker: 'USER',
      text: 'Hello world. ',
    });
    const update2 = preppal.TranscriptUpdate.create({
      speaker: 'USER',
      text: 'This is a test.',
    });

    manager.process(update1);
    manager.process(update2);

    expect(onSentence).toHaveBeenCalledTimes(1);
    expect(onSentence).toHaveBeenCalledWith('USER', 'Hello world.');
    expect(manager.getBufferedText('USER')).toBe('This is a test.');
  });

  it('should not emit incomplete sentences', () => {
    const onSentence = vi.fn();
    const manager = new TranscriptManager({ onSentence });

    const update = preppal.TranscriptUpdate.create({
      speaker: 'AI',
      text: 'This is just the beginning',
    });
    manager.process(update);

    expect(onSentence).not.toHaveBeenCalled();
    expect(manager.getBufferedText('AI')).toBe('This is just the beginning');
  });

  it('should handle multiple sentences in a single chunk', () => {
    const onSentence = vi.fn();
    const manager = new TranscriptManager({ onSentence });

    const update = preppal.TranscriptUpdate.create({
      speaker: 'USER',
      text: 'First sentence. Second sentence! And a third?',
    });
    manager.process(update);

    expect(onSentence).toHaveBeenCalledTimes(2);
    expect(onSentence).toHaveBeenCalledWith('USER', 'First sentence.');
    expect(onSentence).toHaveBeenCalledWith('USER', 'Second sentence!');
    expect(manager.getBufferedText('USER')).toBe('And a third?');
  });

  it('should handle different speakers independently', () => {
    const onSentence = vi.fn();
    const manager = new TranscriptManager({ onSentence });

    const userUpdate = preppal.TranscriptUpdate.create({
      speaker: 'USER',
      text: 'This is the user speaking. ',
    });
    const aiUpdate = preppal.TranscriptUpdate.create({
      speaker: 'AI',
      text: 'And this is the AI. ',
    });
    const userUpdate2 = preppal.TranscriptUpdate.create({
      speaker: 'USER',
      text: 'Confirming.',
    });

    manager.process(userUpdate);
    manager.process(aiUpdate);
    manager.process(userUpdate2);

    expect(onSentence).toHaveBeenCalledTimes(2);
    expect(onSentence).toHaveBeenCalledWith(
      'USER',
      'This is the user speaking.',
    );
    expect(onSentence).toHaveBeenCalledWith('AI', 'And this is the AI.');
    expect(manager.getBufferedText('USER')).toBe('Confirming.');
    expect(manager.getBufferedText('AI')).toBe('');
  });

  it('should ignore empty or invalid updates', () => {
    const onSentence = vi.fn();
    const manager = new TranscriptManager({ onSentence });

    manager.process(null);
    manager.process(undefined);
    manager.process(preppal.TranscriptUpdate.create({ speaker: 'USER' })); // No text
    manager.process(preppal.TranscriptUpdate.create({ text: 'No speaker' })); // No speaker

    expect(onSentence).not.toHaveBeenCalled();
  });
});
