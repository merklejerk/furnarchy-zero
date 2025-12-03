export class CommandBuffer {
	private buffer: string = '';

	/**
	 * Appends a chunk of text to the buffer and returns all complete lines found.
	 * The lines returned do NOT contain the newline character.
	 * Any remaining partial line is kept in the buffer.
	 */
	append(chunk: string): string[] {
		this.buffer += chunk;
		const lines: string[] = [];
		let newlineIndex: number;

		while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
			const line = this.buffer.substring(0, newlineIndex);
			lines.push(line);
			this.buffer = this.buffer.substring(newlineIndex + 1);
		}

		return lines;
	}

	/**
	 * Returns true if the buffer is empty.
	 */
	get isEmpty(): boolean {
		return this.buffer.length === 0;
	}

	/**
	 * Clears the buffer.
	 */
	clear() {
		this.buffer = '';
	}
}
