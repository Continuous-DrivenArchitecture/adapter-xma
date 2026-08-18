import type {
  ArchiModel,
  ArchiElement,
  ArchiRelationship,
  ArchiView,
  ArchiDiagramObject,
  ArchiDiagramConnection,
  ArchiNote,
  ArchiFolder,
  ArchiBounds,
  ArchiBendpoint,
  ArchiStyle,
} from '@cda/archi-semantic-core';

export function makeElement(partial: Partial<ArchiElement> & Pick<ArchiElement, 'id' | 'type'>): ArchiElement {
  return {
    name: partial.name ?? partial.type,
    xsiType: `archimate:${partial.type}`,
    folderId: 'folder-1',
    folderPath: 'Root',
    documentation: null,
    properties: [],
    profiles: [],
    junctionType: null,
    rawJunctionType: null,
    ...partial,
  };
}

export function makeRelationship(
  partial: Partial<ArchiRelationship> & Pick<ArchiRelationship, 'id' | 'type' | 'sourceId' | 'targetId'>,
): ArchiRelationship {
  return {
    name: null,
    xsiType: `archimate:${partial.type}`,
    folderId: 'folder-relations',
    folderPath: 'Relations',
    documentation: null,
    properties: [],
    profiles: [],
    accessType: null,
    strength: null,
    directed: null,
    ...partial,
  };
}

export function makeBounds(x: number, y: number, width: number, height: number): ArchiBounds {
  return { x, y, width, height };
}

export function makeDiagramObject(
  partial: Partial<ArchiDiagramObject> & Pick<ArchiDiagramObject, 'id' | 'viewId'>,
): ArchiDiagramObject {
  return {
    name: null,
    xsiType: 'archimate:DiagramObject',
    parentId: null,
    archimateElementId: null,
    referencedModelId: null,
    bounds: null,
    textPosition: null,
    textAlignment: null,
    figureType: null,
    documentation: null,
    style: null,
    features: [],
    childrenIds: [],
    connectionIds: [],
    ...partial,
  };
}

export function makeDiagramConnection(
  partial: Partial<ArchiDiagramConnection> & Pick<ArchiDiagramConnection, 'id' | 'viewId' | 'sourceId' | 'targetId'>,
): ArchiDiagramConnection {
  return {
    xsiType: 'archimate:Connection',
    archimateRelationshipId: null,
    bendpoints: [],
    style: null,
    features: [],
    ...partial,
  };
}

export function makeBendpoint(partial: Partial<ArchiBendpoint>): ArchiBendpoint {
  return { startX: null, startY: null, endX: null, endY: null, ...partial };
}

export function makeStyle(partial: Partial<ArchiStyle>): ArchiStyle {
  return {
    fillColor: null,
    lineColor: null,
    fontColor: null,
    font: null,
    fontName: null,
    fontSize: null,
    fontStyle: null,
    lineWidth: null,
    alpha: null,
    ...partial,
  };
}

export function makeNote(partial: Partial<ArchiNote> & Pick<ArchiNote, 'id' | 'viewId'>): ArchiNote {
  return {
    name: null,
    parentId: null,
    content: null,
    bounds: null,
    textAlignment: null,
    borderType: null,
    style: null,
    features: [],
    ...partial,
  };
}

export function makeView(partial: Partial<ArchiView> & Pick<ArchiView, 'id'>): ArchiView {
  return {
    name: 'View',
    xsiType: 'archimate:ArchimateDiagramModel',
    type: 'ArchimateDiagramModel',
    folderId: 'folder-views',
    folderPath: 'Views',
    documentation: null,
    properties: [],
    viewpoint: null,
    connectionRouterType: null,
    diagramObjectIds: [],
    diagramConnectionIds: [],
    noteIds: [],
    ...partial,
  };
}

export function makeFolder(partial: Partial<ArchiFolder> & Pick<ArchiFolder, 'id' | 'type'>): ArchiFolder {
  return {
    name: partial.type,
    parentId: null,
    path: partial.type ?? '',
    containedIds: [],
    documentation: null,
    properties: [],
    ...partial,
  };
}

export function makeModel(partial: Partial<ArchiModel> = {}): ArchiModel {
  return {
    metadata: {
      id: 'model-1',
      name: 'Test Model',
      version: '5.0.0',
      purpose: null,
      properties: [],
    },
    folders: [],
    elements: [],
    relationships: [],
    views: [],
    diagramObjects: [],
    diagramConnections: [],
    notes: [],
    profiles: [],
    ...partial,
  };
}
