export class Notice {
  static messages: string[] = [];

  constructor(message: string | DocumentFragment) {
    Notice.messages.push(typeof message === "string" ? message : message.textContent ?? "");
  }

  setMessage(message: string | DocumentFragment): this {
    Notice.messages.push(typeof message === "string" ? message : message.textContent ?? "");
    return this;
  }

  hide(): void {}
}

export class Plugin {
  app: unknown;
  manifest: unknown;
  readonly commands: Array<{
    id: string;
    name: string;
    callback?: () => unknown;
    checkCallback?: (checking: boolean) => boolean | void;
  }> = [];
  readonly registeredEvents: unknown[] = [];
  readonly registeredCleanups: Array<() => unknown> = [];
  readonly settingTabs: unknown[] = [];
  persistedData: unknown = null;

  constructor(app: unknown, manifest: unknown) {
    this.app = app;
    this.manifest = manifest;
  }

  addCommand(command: {
    id: string;
    name: string;
    callback?: () => unknown;
    checkCallback?: (checking: boolean) => boolean | void;
  }): typeof command {
    this.commands.push(command);
    return command;
  }

  registerEvent(eventRef: unknown): void {
    this.registeredEvents.push(eventRef);
  }

  register(cb: () => unknown): void {
    this.registeredCleanups.push(cb);
  }

  async loadData(): Promise<unknown> {
    return this.persistedData;
  }

  async saveData(data: unknown): Promise<void> {
    this.persistedData = data;
  }

  addSettingTab(settingTab: unknown): void {
    this.settingTabs.push(settingTab);
  }

  registerMarkdownCodeBlockProcessor(_lang: string, _cb: unknown): void {}

  registerEditorSuggest(_suggest: unknown): void {}

  onunload(): void {}
}

export class EditorSuggest<T> {
  constructor(_app: unknown) {}

  close(): void {}
}

export class PluginSettingTab {
  app: unknown;
  plugin: Plugin;
  containerEl: HTMLElement;

  constructor(app: unknown, plugin: Plugin) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = document.createElement("div");
  }

  display(): void {}

  hide(): void {}
}

export class MarkdownRenderChild {
  containerEl: HTMLElement;

  constructor(containerEl: HTMLElement) {
    this.containerEl = containerEl;
  }

  onload(): void {}

  onunload(): void {}
}

export class Modal {
  app: unknown;
  contentEl: HTMLElement;
  titleEl: HTMLElement;
  modalEl: HTMLElement;

  constructor(app: unknown) {
    this.app = app;
    this.modalEl = document.createElement("div");
    this.titleEl = document.createElement("div");
    this.contentEl = document.createElement("div");
    this.modalEl.append(this.titleEl, this.contentEl);
  }

  open(): void {
    document.body.appendChild(this.modalEl);
    void this.onOpen();
  }

  close(): void {
    this.modalEl.remove();
    this.onClose();
  }

  onOpen(): void | Promise<void> {}

  onClose(): void {}

  setTitle(title: string): this {
    this.titleEl.textContent = title;
    return this;
  }
}

export class Setting {
  settingEl: HTMLElement;
  nameEl: HTMLElement;
  descEl: HTMLElement;
  controlEl: HTMLElement;

  constructor(containerEl: HTMLElement) {
    this.settingEl = document.createElement("div");
    this.nameEl = document.createElement("div");
    this.descEl = document.createElement("div");
    this.controlEl = document.createElement("div");
    this.settingEl.append(this.nameEl, this.descEl, this.controlEl);
    containerEl.appendChild(this.settingEl);
  }

  setName(name: string): this {
    this.nameEl.textContent = name;
    return this;
  }

  setDesc(desc: string | DocumentFragment): this {
    if (typeof desc === "string") {
      this.descEl.textContent = desc;
    } else {
      this.descEl.append(desc);
    }
    return this;
  }

  addToggle(_cb: (component: unknown) => unknown): this {
    return this;
  }

  addText(_cb: (component: unknown) => unknown): this {
    return this;
  }
}

export class Vault {
  private readonly existingFiles = new Map<string, TFile>();

  addExistingFile(path: string): TFile {
    const file = new TFile(path);
    this.existingFiles.set(path, file);
    return file;
  }

  async create(path: string, _data: string): Promise<TFile> {
    return this.addExistingFile(path);
  }

  getAbstractFileByPath(path: string): TFile | null {
    return this.existingFiles.get(path) ?? null;
  }
}

export class App {
  vault: Vault;

  constructor() {
    this.vault = new Vault();
  }
}

export class TFile {
  path: string;
  basename: string;
  extension: string;

  constructor(path: string) {
    this.path = path;
    const name = path.split("/").pop() ?? path;
    const dot = name.lastIndexOf(".");
    this.basename = dot >= 0 ? name.slice(0, dot) : name;
    this.extension = dot >= 0 ? name.slice(dot + 1) : "";
  }
}

export const Platform = {
  isMobile: false,
};

export async function requestUrl(
  _opts: unknown,
): Promise<{ json: unknown; text: string; arrayBuffer: ArrayBuffer }> {
  return { json: {}, text: "", arrayBuffer: new ArrayBuffer(0) };
}
