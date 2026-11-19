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

  private async getHash(file: File) {
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

  public async removeFile(file: File) {
    const hash = await this.getHash(file);
    this.removeByKey("pml_" + hash);
    this.display();
  }

  private removeByKey(key: string) {
    localStorage.removeItem(key);
  }

  private getFiles() {
    const entries: HistoryEntry[] = [];
    for (const key in localStorage) {
      if (key.startsWith("pml_")) {
        const entry = localStorage.getItem(key);
        if (!entry) continue;
        try {
          entries.push(JSON.parse(entry) as HistoryEntry);
        } catch (e: unknown) {
          const error = e as SyntaxError;

          // remove any corrupted entries
          console.log(
            `Failed to parse history entry [${entry.slice(0, 64)}...]\n${error.message}\nREMOVED FILE`,
          );

          this.removeByKey(key);

          continue;
        }
      }
    }

    return entries.sort((a, b) => b.date - a.date);
  }

  private display() {
    this.container.replaceChildren();
    this.files = this.getFiles();

    if (this.files.length === 0) {
      const btn = document.createElement("button");
      const span = document.createElement("span");
      btn.classList.add("secondary");
      span.textContent = "No previously loaded files found in history.";
      btn.appendChild(span);
      this.container.appendChild(btn);
      return;
    }

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
