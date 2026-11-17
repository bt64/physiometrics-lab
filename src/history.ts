import type { Loader } from "./loader";

type HistoryEntry = {
  name: string;
  date: number;
  data: string;
};

export class History {
  private files: HistoryEntry[] = this.getFiles();
  private container: HTMLDivElement = document.querySelector("#history-dialog div")!;

  constructor(private loader: Loader) {
    this.display();
  }

  private bufferToHex(buffer: ArrayBuffer) {
    return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  private bufferToBase64(buffer: ArrayBuffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }

  private base64ToBuffer(base64: string) {
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer;
  }

  private base64ToFile(base64: string, name: string) {
    const buffer = this.base64ToBuffer(base64);
    return new File([buffer], name, { type: "application/octet-stream" });
  }

  public async getHash(file: File) {
    const buf = await file.arrayBuffer();
    const hash = await crypto.subtle.digest("SHA-256", buf);
    return this.bufferToHex(hash);
  }

  public async addFile(file: File) {
    const hash = await this.getHash(file);
    const entry: HistoryEntry = {
      name: file.name,
      date: Date.now(),
      data: this.bufferToBase64(await file.arrayBuffer()),
    };

    localStorage.setItem("pml_" + hash, JSON.stringify(entry));
    this.display();
  }

  private getFile(hash: string) {
    const entry = localStorage.getItem(hash);
    if (!entry) return null;

    const parsed = JSON.parse(entry);
    const data = this.base64ToBuffer(parsed.data);
    const file = new File([data], parsed.name, {
      type: "application/octet-stream",
    });

    return file;
  }

  public removeFile() {}

  private getFiles() {
    const entries: HistoryEntry[] = [];
    for (const key in localStorage) {
      if (key.startsWith("pml_")) {
        const entry = localStorage.getItem(key);
        if (!entry) continue;

        entries.push(JSON.parse(entry) as HistoryEntry);
      }
    }

    return entries.sort((a, b) => b.date - a.date);
  }

  private display() {
    this.container.replaceChildren();
    this.files = this.getFiles();

    for (const entry of this.files) {
      const span = document.createElement("span");
      span.textContent = new Date(entry.date).toLocaleString();

      const btn = document.createElement("button");
      btn.textContent = entry.name;
      btn.classList.add("secondary");
      btn.popoverTargetElement = document.querySelector("#history-dialog")!;
      btn.popoverTargetAction = "close";

      btn.appendChild(span);
      btn.addEventListener("click", () => {
        const file = this.base64ToFile(entry.data, entry.name);
        this.loader.load(file);
      });

      this.container.appendChild(btn);
    }
  }
}
