import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const emptyProfiles = () => ({});

/** Persists the selected orientation profile for each WhatsApp chat. */
export class ProfileStore {
  #filePath;
  #profiles = null;

  constructor(filePath) {
    this.#filePath = filePath;
  }

  async get(chatId) {
    const profiles = await this.#load();
    return profiles[chatId] ?? null;
  }

  async set(chatId, profile) {
    const profiles = await this.#load();
    this.#profiles = { ...profiles, [chatId]: profile };
    await this.#save();
  }

  async #load() {
    if (this.#profiles !== null) return this.#profiles;

    try {
      const content = await readFile(this.#filePath, "utf8");
      this.#profiles = JSON.parse(content);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      this.#profiles = emptyProfiles();
    }

    return this.#profiles;
  }

  async #save() {
    await mkdir(dirname(this.#filePath), { recursive: true });
    await writeFile(this.#filePath, JSON.stringify(this.#profiles, null, 2), "utf8");
  }
}
