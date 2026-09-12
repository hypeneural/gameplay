/** One suspended wire and a damped bell; all time is supplied by the frame owner. */
export class ChristmasCordSimulation {
  sag = 40;
  angle = 0;
  clapper = 0;
  private time = 0;
  private velocity = 0;
  private strikeTime = 10;

  ring(): void {
    this.velocity = 125;
    this.strikeTime = 0;
  }

  step(seconds: number): void {
    const dt = Math.min(0.04, Math.max(0, seconds));
    this.time += dt;
    this.strikeTime += dt;
    this.sag = 40 + Math.sin(this.time * 0.32) * 5 + Math.sin(this.time * 0.57) * 1.5;
    const wind = Math.sin(this.time * 0.48) * 2.7 + Math.sin(this.time * 0.21) * 0.8;
    this.velocity += ((wind - this.angle) * 28 - this.velocity * 4.6) * dt;
    this.angle += this.velocity * dt;
    this.clapper =
      -this.angle * 0.6 + Math.sin(this.strikeTime * 22) * Math.exp(-this.strikeTime * 3.8) * 18;
  }
}
