export abstract class ErrorDialog {
  private static dialog: HTMLDialogElement = document.querySelector("#error-dialog")!;
  private static messageDiv: HTMLDivElement = this.dialog.querySelector("div")!;

  /**
   * Displays an error message in a dialog box.
   */
  public static show(message: string) {
    this.messageDiv.textContent = message;
    this.dialog.showPopover();
  }
}
