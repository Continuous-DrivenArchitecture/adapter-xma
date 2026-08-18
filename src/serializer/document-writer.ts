import type { ArchiFolder, ArchiView } from '@cda/archi-semantic-core';
import type { XmlElement } from '../infrastructure/xml-writer.js';
import { element, textElement } from '../infrastructure/xml-writer.js';
import type { XmaIdRegistry } from '../infrastructure/id-allocator.js';
import { SCHEME_BY_CATEGORY, TECHNOLOGY_PHYSICAL_FOLDER, VIEWS_FOLDER } from '../mapping/scheme-mapping.js';
import type { PresentationCategory } from '../mapping/element-mapping.js';
import { buildProfileValues } from './profile-values.js';
import { renderSchemeChildren, type SchemeBuild } from './semantic-writer.js';
import type { ViewBuildResult } from './view-writer.js';

/** Confirmed verbatim from both reference fixtures — the real XMA namespace set. */
const XML_NAMESPACES: Array<[string, string]> = [
  ['xmlns:builtins', 'http://www.bizzdesign.com/metamodels/builtins'],
  ['xmlns:Base', 'http://www.bizzdesign.com/metamodels/Base'],
  ['xmlns:MM_ModelPackage', 'http://www.bizzdesign.com/metamodels/MM_ModelPackage'],
  ['xmlns:Component', 'http://www.bizzdesign.com/metamodels/Component'],
  ['xmlns:Amber', 'http://www.bizzdesign.com/metamodels/Amber'],
  ['xmlns:ArchiMate', 'http://www.bizzdesign.com/metamodels/ArchiMate3.0'],
  ['xmlns:BMC', 'http://www.bizzdesign.com/metamodels/BMC'],
  ['xmlns:BPMN', 'http://www.bizzdesign.com/metamodels/BPMN'],
  ['xmlns:Connection', 'http://www.bizzdesign.com/metamodels/Connection'],
  ['xmlns:DMN', 'http://www.bizzdesign.com/metamodels/DMN'],
  ['xmlns:ERD', 'http://www.bizzdesign.com/metamodels/ERD'],
  ['xmlns:Lean', 'http://www.bizzdesign.com/metamodels/Lean'],
  ['xmlns:META', 'http://www.bizzdesign.com/metamodels/META'],
  ['xmlns:MM_Diagram', 'http://www.bizzdesign.com/metamodels/MM_Diagram'],
  ['xmlns:TDM', 'http://www.bizzdesign.com/metamodels/TDM'],
  ['xmlns:UML', 'http://www.bizzdesign.com/metamodels/UML'],
];

const ROOT_LEVEL_CATEGORIES: PresentationCategory[] = [
  'Strategy',
  'Business',
  'Application',
  'Motivation',
  'ImplementationMigration',
  'Location', // Location and Grouping share CompositeScheme — deduplicated below.
];

function findFolderName(folders: readonly ArchiFolder[], type: string, fallback: string): string {
  return folders.find((f) => f.type === type)?.name ?? fallback;
}

function renderRootScheme(
  schemeBuilds: Map<string, SchemeBuild>,
  ids: XmaIdRegistry,
  category: PresentationCategory,
  folders: readonly ArchiFolder[],
  language: string,
  emitted: Set<string>,
): XmlElement | null {
  const info = SCHEME_BY_CATEGORY[category];
  if (emitted.has(info.tag)) {
    return null;
  }
  const build = schemeBuilds.get(info.tag);
  if (!build) {
    return null;
  }
  emitted.add(info.tag);
  const nameProfile =
    info.folderType && info.defaultLabel
      ? buildProfileValues(language, findFolderName(folders, info.folderType, info.defaultLabel))
      : null;
  const children = renderSchemeChildren(build, nameProfile);
  return element(`ArchiMate:${info.tag}`, [['id', String(ids.fresh())]], children);
}

function renderNestedScheme(build: SchemeBuild | undefined, ids: XmaIdRegistry): XmlElement | null {
  if (!build) {
    return null;
  }
  const children = renderSchemeChildren(build, null);
  return element(`ArchiMate:${build.tag}`, [['id', String(ids.fresh())]], children);
}

export interface DocumentAssemblyInput {
  modelName: string;
  packageName: string;
  language: string;
  ids: XmaIdRegistry;
  schemeBuilds: Map<string, SchemeBuild>;
  folders: readonly ArchiFolder[];
  view: ArchiView | null;
  viewResult: ViewBuildResult | null;
  /** The `MM_Diagram:MM_Diagram` built by `graphical-writer`, when a view is present. */
  graphicalDiagramXml: XmlElement | null;
}

export function buildXmaDocument(input: DocumentAssemblyInput): XmlElement {
  const { modelName, packageName, language, ids, schemeBuilds, folders, view, viewResult, graphicalDiagramXml } = input;

  const emittedSchemeTags = new Set<string>();
  const rootSchemesXml = ROOT_LEVEL_CATEGORIES.map((category) =>
    renderRootScheme(schemeBuilds, ids, category, folders, language, emittedSchemeTags),
  ).filter((el): el is XmlElement => el !== null);

  const technologySchemeXml = renderNestedScheme(schemeBuilds.get(SCHEME_BY_CATEGORY.Technology.tag), ids);
  const physicalSchemeXml = renderNestedScheme(schemeBuilds.get(SCHEME_BY_CATEGORY.Physical.tag), ids);

  const topLevelFolders: XmlElement[] = [];
  if (technologySchemeXml || physicalSchemeXml) {
    const nestedSchemes = [technologySchemeXml, physicalSchemeXml].filter((el): el is XmlElement => el !== null);
    topLevelFolders.push(
      element('ArchiMate:AbstractFolder', [['id', String(ids.fresh())]], [
        textElement('nm', findFolderName(folders, TECHNOLOGY_PHYSICAL_FOLDER.archiFolderType, TECHNOLOGY_PHYSICAL_FOLDER.defaultLabel)),
        element('ArchiMate:AbstractSchemes', [['name', 'schemes'], ['id', String(ids.fresh())]], nestedSchemes),
        element('ArchiMate:AbstractViews', [['name', 'views'], ['id', String(ids.fresh())]]),
        element('ArchiMate:AbstractFolders', [['name', 'folders'], ['id', String(ids.fresh())]]),
      ]),
    );
  }

  let allViewXmaId: number | null = null;
  if (view && viewResult) {
    allViewXmaId = ids.idFor(view.id);
    const allViewXml = element(
      'ArchiMate:AllView',
      [['id', String(allViewXmaId)]],
      [
        buildProfileValues(language, view.name ?? '', view.documentation),
        ...(viewResult.viewGraphicsXml.length > 0
          ? [element('ArchiMate:ViewGraphics', [['name', 'viewGraphics'], ['id', String(ids.fresh())]], viewResult.viewGraphicsXml)]
          : []),
        element('ArchiMate:RefObjects', [['name', 'refObjects'], ['id', String(ids.fresh())]], viewResult.refObjectsXml),
      ],
    );
    topLevelFolders.push(
      element('ArchiMate:AbstractFolder', [['id', String(ids.fresh())]], [
        textElement('nm', findFolderName(folders, VIEWS_FOLDER.archiFolderType, VIEWS_FOLDER.defaultLabel)),
        element('ArchiMate:AbstractSchemes', [['name', 'schemes'], ['id', String(ids.fresh())]]),
        element('ArchiMate:AbstractViews', [['name', 'views'], ['id', String(ids.fresh())]], [allViewXml]),
        element('ArchiMate:AbstractFolders', [['name', 'folders'], ['id', String(ids.fresh())]]),
      ]),
    );
  }

  const modelNameProfile = buildProfileValues(language, modelName);
  const archiMateComponent = element(
    'ArchiMate:ArchiMateComponent',
    [['name', 'root'], ['id', String(ids.fresh())]],
    [
      modelNameProfile,
      element('ArchiMate:DomainDataSet', [['name', 'domainDataSet'], ['id', String(ids.fresh())]]),
      element('ArchiMate:AbstractCommandContainers', [['name', 'commandContainers'], ['id', String(ids.fresh())]]),
      element('ArchiMate:AbstractSchemes', [['name', 'schemes'], ['id', String(ids.fresh())]], rootSchemesXml),
      element('ArchiMate:AbstractViews', [['name', 'views'], ['id', String(ids.fresh())]]),
      element('ArchiMate:AbstractFolders', [['name', 'folders'], ['id', String(ids.fresh())]], topLevelFolders),
    ],
  );

  const semanticModule = element(
    'MM_ModelPackage:MM_Module',
    [['id', String(ids.fresh())], ['nm', 'SemanticModule'], ['metaModel', 'ArchiMate']],
    [archiMateComponent],
  );

  const modules: XmlElement[] = [semanticModule];
  if (graphicalDiagramXml && allViewXmaId !== null) {
    modules.push(
      element(
        'MM_ModelPackage:MM_Module',
        [['id', String(ids.fresh())], ['nm', 'GraphicalModule'], ['metaModel', 'MM_Diagram']],
        [graphicalDiagramXml, element('Any', [['name', 'tag']], [element('Objectref', [['value', String(allViewXmaId)]])])],
      ),
    );
  }

  const archiMateMMModel = element('ArchiMate:ArchiMateMM_Model', [['id', String(ids.fresh())]], [
    buildProfileValues(language, modelName),
    element('MM_ModelPackage:MM_Modules', [['name', 'modules'], ['id', String(ids.fresh())]], modules),
  ]);

  const modelPackage = element(
    'MM_ModelPackage:MM_ModelPackage',
    [['id', String(ids.fresh())]],
    [
      textElement('nm', packageName),
      element('MM_ModelPackage:MM_Folders', [['name', 'folders'], ['id', String(ids.fresh())]]),
      element('MM_ModelPackage:MM_Models', [['name', 'models'], ['id', String(ids.fresh())]], [archiMateMMModel]),
      element('MM_ModelPackage:DependencyRelations', [['name', 'dependencyRelations'], ['id', String(ids.fresh())]]),
      element('MM_ModelPackage:MM_Languages', [['name', 'languages'], ['id', String(ids.fresh())]], [
        element('MM_ModelPackage:MM_Language', [['id', String(ids.fresh())], ['isDefault', 'true']], [textElement('nm', language)]),
      ]),
    ],
  );

  return element(
    'MM_Document',
    [
      ['version', '2.0'],
      ['format', 'XML'],
      ['includeMetaModels', 'false'],
      ['requiredEngineVersion', '1'],
      ...XML_NAMESPACES,
    ],
    [element('MM_StorageUnit', undefined, [modelPackage])],
  );
}
