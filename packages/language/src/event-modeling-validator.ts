/*
 * SPDX-License-Identifier: MIT AND Apache-2.0
 *
 * Portions derived from mermaid-js/mermaid
 *   https://github.com/mermaid-js/mermaid
 *   PR #7588 (commit d50c423), PR #7629 (commit 32c257e)
 *   Copyright (c) Yordis Prieto, MIT License
 *
 * Modifications and integration with event-modeling-tools:
 *   Copyright (c) 2026 Ladislav Gazo, Apache-2.0 License
 *
 * The MIT License notice for the imported portions is reproduced in the
 * THIRD_PARTY_NOTICES.md file at the root of this repository.
 */

import type { ValidationAcceptor, ValidationChecks } from 'langium';
import type { EmFrame, EmResetFrame, EmTimeFrame, EventModelingAstType } from './generated/ast.js';
import type { EventModelingServices } from './event-modeling-module.js';

const COMMAND_TYPES = new Set<string>(['cmd', 'command']);
const EVENT_TYPES = new Set<string>(['evt', 'event']);
const READMODEL_TYPES = new Set<string>(['rmo', 'readmodel']);
const PROCESSOR_TYPES = new Set<string>(['pcr', 'processor']);
const UI_TYPES = new Set<string>(['ui']);

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: EventModelingServices) {
    const validator = services.validation.EventModelingValidator;
    const registry = services.validation.ValidationRegistry;
    if (registry) {
        const checks: ValidationChecks<EventModelingAstType> = {
            EmTimeFrame: validator.checkSourceFrameTypes.bind(validator),
            EmResetFrame: validator.checkSourceFrameTypes.bind(validator),
        };
        registry.register(checks, validator);
    }
}

/**
 * Implementation of custom validations.
 */
export class EventModelingValidator {
    checkSourceFrameTypes(frame: EmTimeFrame | EmResetFrame, accept: ValidationAcceptor): void {
        if (frame.sourceFrames.length === 0) {
            return;
        }

        if (COMMAND_TYPES.has(frame.modelEntityType)) {
            this.validateSources(
                frame,
                new Set([...UI_TYPES, ...PROCESSOR_TYPES]),
                'command',
                'ui or processor',
                accept
            );
        } else if (EVENT_TYPES.has(frame.modelEntityType)) {
            this.validateSources(frame, COMMAND_TYPES, 'event', 'command', accept);
        } else if (READMODEL_TYPES.has(frame.modelEntityType)) {
            this.validateSources(frame, EVENT_TYPES, 'read model', 'event', accept);
        } else if (PROCESSOR_TYPES.has(frame.modelEntityType)) {
            this.validateSources(frame, READMODEL_TYPES, 'processor', 'read model', accept);
        } else if (UI_TYPES.has(frame.modelEntityType)) {
            this.validateSources(frame, READMODEL_TYPES, 'ui', 'read model', accept);
        }
    }

    private validateSources(
        frame: EmTimeFrame | EmResetFrame,
        allowedSourceTypes: Set<string>,
        targetLabel: string,
        expectedSourceLabel: string,
        accept: ValidationAcceptor
    ): void {
        for (const sourceRef of frame.sourceFrames) {
            const source: EmFrame | undefined = sourceRef.ref;
            if (source !== undefined && !allowedSourceTypes.has(source.modelEntityType)) {
                accept(
                    'error',
                    `A ${targetLabel} can only receive input from a ${expectedSourceLabel}, not from '${source.modelEntityType}'.`,
                    { node: frame, property: 'sourceFrames' }
                );
            }
        }
    }
}
