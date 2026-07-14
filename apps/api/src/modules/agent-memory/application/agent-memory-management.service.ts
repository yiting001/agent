import { Injectable, Logger } from '@nestjs/common';

import {
  ChatAttachmentStorage,
  type StoredChatAttachment,
} from '../../chat/application/chat-attachment.storage';
import type { AgentMemory, AgentMemoryArtifact } from '../domain/agent-memory';
import { AgentMemoryIndex } from './agent-memory.index';
import { AgentMemoryRepository } from './agent-memory.repository';

export interface AgentMemoryDetail {
  artifacts: AgentMemoryArtifact[];
  memory: AgentMemory;
}

@Injectable()
export class AgentMemoryManagementService {
  private readonly logger = new Logger(AgentMemoryManagementService.name);

  constructor(
    private readonly repository: AgentMemoryRepository,
    private readonly index: AgentMemoryIndex,
    private readonly attachmentStorage: ChatAttachmentStorage,
  ) {}

  async clearAgentMemory(agentId: string, ownerKey: string): Promise<void> {
    const artifacts = await this.repository.listArtifacts(agentId, ownerKey);

    await this.repository.clearAgentMemory(agentId, ownerKey);
    await this.ignoreIndexFailure(
      'agent_memory.clear_index',
      this.index.clear(agentId, ownerKey),
    );
    await this.deleteUnreferencedAttachments(agentId, ownerKey, artifacts);
  }

  async deleteMemory(
    agentId: string,
    ownerKey: string,
    memoryId: string,
  ): Promise<void> {
    const memory = await this.repository.findMemory(
      agentId,
      ownerKey,
      memoryId,
    );

    if (!memory) {
      return;
    }

    const artifacts = await this.repository.listArtifacts(agentId, ownerKey, [
      memoryId,
    ]);

    await this.repository.deleteMemory(agentId, ownerKey, memoryId);
    await this.ignoreIndexFailure(
      'agent_memory.delete_index',
      this.index.delete([memoryId]),
    );
    await this.deleteUnreferencedAttachments(agentId, ownerKey, artifacts);
  }

  async listAgentMemories(
    agentId: string,
    ownerKey: string,
  ): Promise<AgentMemoryDetail[]> {
    const memories = await this.repository.listMemories(agentId, ownerKey, 100);
    const artifacts = await this.repository.listArtifacts(
      agentId,
      ownerKey,
      memories.map((memory) => memory.id),
    );

    return memories.map((memory) => ({
      artifacts: artifacts.filter(
        (artifact) => artifact.memoryId === memory.id,
      ),
      memory,
    }));
  }

  async readArtifact(
    agentId: string,
    ownerKey: string,
    memoryId: string,
    artifactId: string,
  ): Promise<StoredChatAttachment | undefined> {
    const artifacts = await this.repository.listArtifacts(agentId, ownerKey, [
      memoryId,
    ]);
    const artifact = artifacts.find((candidate) => candidate.id === artifactId);

    if (!artifact) {
      return undefined;
    }

    return this.attachmentStorage.read(artifact.attachmentId, {
      agentId,
      ownerKey,
    });
  }

  private async deleteUnreferencedAttachments(
    agentId: string,
    ownerKey: string,
    deleted: AgentMemoryArtifact[],
  ): Promise<void> {
    if (deleted.length === 0) {
      return;
    }

    const remaining = await this.repository.listArtifacts(agentId, ownerKey);
    const referencedIds = new Set(
      remaining.map((artifact) => artifact.attachmentId),
    );

    await Promise.all(
      deleted
        .map((artifact) => artifact.attachmentId)
        .filter((attachmentId) => !referencedIds.has(attachmentId))
        .map((attachmentId) => this.attachmentStorage.delete(attachmentId)),
    );
  }

  private async ignoreIndexFailure(
    operationName: string,
    operation: Promise<void>,
  ): Promise<void> {
    try {
      await operation;
    } catch (error) {
      this.logger.warn(
        JSON.stringify({
          error: error instanceof Error ? error.message : '未知错误',
          operation: operationName,
        }),
      );
    }
  }
}
