import { musicLibraryService } from './musicLibraryService';
import type { MusicPiece, MusicPieceInput } from '../types/musicLibrary';

export const musicLibraryWorkflows = {
  /**
   * Complex workflow that creates a parent piece, optionally uploads a tutti audio file,
   * and optionally creates multiple child movements that inherit parent metadata.
   */
  async createPieceWithMovementsAndTutti(
    data: Partial<MusicPieceInput>,
    options?: {
      tuttiFile?: File | null;
      movements?: { title: string; duration?: string }[];
    }
  ): Promise<MusicPiece> {
    let parent = await musicLibraryService.createPiece(data);

    if (options?.tuttiFile) {
      const formData = new FormData();
      formData.append('audioFiles', options.tuttiFile);
      const uploaded = await musicLibraryService.updatePiece(parent.id, formData);
      
      const lastFile = uploaded.audioFiles?.[uploaded.audioFiles.length - 1];
      if (lastFile) {
        parent = await musicLibraryService.updatePiece(parent.id, {
          audioTrackMapping: {
            ...(parent.audioTrackMapping || {}),
            tutti: lastFile
          }
        });
      }
    }

    if (options?.movements && options.movements.length > 0) {
      await Promise.all(
        options.movements.map((mov) =>
          musicLibraryService.createPiece({
            title: mov.title,
            duration: mov.duration || undefined,
            parentId: parent.id,
            composer: parent.composer || undefined,
            voicing: parent.voicing || undefined,
            copies: parent.copies !== undefined ? parent.copies : undefined,
            catalogId: parent.catalogId || undefined,
            genres: parent.genres || [],
            performances: []
          })
        )
      );
    }

    return parent;
  }
};
