import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';

export class SelfReportingStdioTransport extends StdioServerTransport {
  constructor(private readonly onClosed: () => void) {
    super();
  }

  override async close(): Promise<void> {
    await super.close();
    this.onClosed();
  }
}
