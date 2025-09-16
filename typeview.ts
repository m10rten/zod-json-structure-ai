export type SlideRender = () => string | Promise<string>;

export type StageRender = (args: {
  stage: number; // current stage index for this slide
  totalStages: number; // total stages for this slide
  slide: Slide; // the slide instance
}) => string | Promise<string>;

export type StageMode = "replace" | "append" | "accumulate";

export interface SlideStage {
  // Content for this stage (ignored if render is provided)
  content?: string | string[];
  // Optional stage-specific renderer (takes precedence over content)
  render?: StageRender;
  // Controls how this stage is printed relative to base content and previous stages
  // IMPORTANT: Base slide content is ALWAYS shown when stages exist.
  // - replace: base content + ONLY the current stage content
  // - append: base content + ONLY the current stage content (no carry-over)
  // - accumulate: base content + ALL stages from 0..current
  mode?: StageMode;
}

export interface SlideOptions {
  title: string;
  header?: string;
  footer?: string;
  content?: string | string[]; // Base content (always shown when stages exist)
  stages?: SlideStage[]; // Optional per-slide stages
  render?: SlideRender; // Legacy/custom full render (ignored when stages are set)
}

export class Slide {
  public readonly title: string;
  public readonly header?: string;
  public readonly footer?: string;
  public readonly render?: SlideRender;

  private readonly _content?: string | string[];
  private readonly _stages: SlideStage[];

  constructor(ctx: SlideOptions) {
    if (!ctx || !ctx.title) {
      throw new TypeError("Slide requires a title.");
    }
    this.title = ctx.title;
    this.header = ctx.header;
    this.footer = ctx.footer;
    this._content = ctx.content;
    this._stages = Array.isArray(ctx.stages) ? ctx.stages : [];
    // If stages are provided, they control rendering. Otherwise, use render or default.
    this.render =
      this._stages.length === 0
        ? ctx.render ?? (() => this.defaultRender())
        : undefined;
  }

  public get stageCount(): number {
    return Math.max(1, this._stages.length || 1);
  }

  public hasStages(): boolean {
    return this._stages.length > 0;
  }

  // Compute the full body string for the given stage
  public async renderStage(stage: number): Promise<string> {
    if (!this.hasStages()) {
      // No stages: use legacy/custom or default
      if (this.render) {
        const body = await this.render();
        return typeof body === "string" ? body : "";
      }
      return this.defaultRender();
    }

    // Bound stage to available range
    const sIndex = Math.max(0, Math.min(stage, this._stages.length - 1));
    const current = this._stages[sIndex];
    const mode: StageMode = current.mode ?? "accumulate";

    const base = normalizeToLines(this._content);

    // Helper to realize a single stage's body
    const renderOne = async (idx: number): Promise<string[]> => {
      const st = this._stages[idx];
      if (st.render) {
        const out = await st.render({
          stage: sIndex, // current stage of the slide, by design
          totalStages: this._stages.length,
          slide: this,
        });
        return normalizeToLines(out);
      }
      return normalizeToLines(st.content);
    };

    if (mode === "replace") {
      // FIX: Always include base content
      const cur = await renderOne(sIndex);
      return [...base, ...cur].join("\n");
    }

    if (mode === "append") {
      // Base + only current stage content
      const cur = await renderOne(sIndex);
      return [...base, ...cur].join("\n");
    }

    // accumulate: base + all stages up to current
    const acc: string[] = [...base];
    for (let i = 0; i <= sIndex; i++) {
      const part = await renderOne(i);
      acc.push(...part);
    }
    return acc.join("\n");
  }

  private defaultRender(): string {
    if (typeof this._content === "string") {
      return this._content;
    }
    if (Array.isArray(this._content)) {
      return this._content.join("\n");
    }
    return "";
  }
}

function normalizeToLines(input?: string | string[]): string[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.flatMap(splitLines);
  return splitLines(input);
}

function splitLines(s: string): string[] {
  return s.split(/\r?\n/);
}

/* ANSI styling helpers (no external packages) */
type StyleFn = (s: string) => string;

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  fg: {
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    gray: "\x1b[60m",
  },
} as const;

function style(...codes: string[]): StyleFn {
  return (s: string) => `${codes.join("")}${s}${ANSI.reset}`;
}

export interface TypeViewTheme {
  header: StyleFn;
  title: StyleFn;
  footer: StyleFn;
  controls: StyleFn;
  slideIndicator: StyleFn;
  body: StyleFn;
  notice: StyleFn;
}

function buildDefaultTheme(): TypeViewTheme {
  return {
    header: style(ANSI.dim, ANSI.fg.green),
    title: style(ANSI.bold, ANSI.fg.cyan),
    footer: style(ANSI.dim, ANSI.fg.gray),
    controls: style(ANSI.dim, ANSI.fg.gray),
    slideIndicator: style(ANSI.fg.yellow),
    body: style(ANSI.fg.white),
    notice: style(ANSI.fg.magenta),
  };
}

export interface TypeViewOptions {
  title?: string; // Presentation title (printed above slide title if provided)
  header?: string; // Default header for all slides (slide.header overrides)
  footer?: string; // Default footer for all slides (slide.footer overrides)
  clearOnRender?: boolean; // Default true
  showControls?: boolean; // Default true
  showSlideIndicator?: boolean; // Default true
  showStageIndicator?: boolean; // Default true
  keyboardNavigation?: boolean; // Default true
  theme?: Partial<TypeViewTheme>;
  exitOnLastSlide?: boolean; // If true, pressing next on last slide exits (default false)
  // Non-interactive mode behavior: render all stages or only final stage
  nonInteractiveStages?: "all" | "final"; // Default "all"
}

export class TypeView {
  private readonly slides: Slide[] = [];
  private readonly opts: Required<Omit<TypeViewOptions, "theme">> & {
    theme: TypeViewTheme;
  };
  private index = 0;
  private running = false;
  private stagePerSlide: number[] = [];

  constructor(options?: TypeViewOptions) {
    const theme = { ...buildDefaultTheme(), ...(options?.theme ?? {}) };
    this.opts = {
      title: options?.title ?? "",
      header: options?.header ?? "",
      footer: options?.footer ?? "",
      clearOnRender: options?.clearOnRender ?? true,
      showControls: options?.showControls ?? true,
      showSlideIndicator: options?.showSlideIndicator ?? true,
      showStageIndicator: options?.showStageIndicator ?? true,
      keyboardNavigation: options?.keyboardNavigation ?? true,
      exitOnLastSlide: options?.exitOnLastSlide ?? false,
      nonInteractiveStages: options?.nonInteractiveStages ?? "all",
      theme,
    };
  }

  public addSlide(slideOrInit: Slide | SlideOptions): this {
    const s =
      slideOrInit instanceof Slide ? slideOrInit : new Slide(slideOrInit);
    this.slides.push(s);
    // initialize stage index for this slide
    this.stagePerSlide.push(0);
    return this;
  }

  public get length(): number {
    return this.slides.length;
  }

  public async run(): Promise<void> {
    if (this.running) return;
    if (this.slides.length === 0) {
      throw new Error("TypeView has no slides. Add slides before run().");
    }

    this.running = true;
    const isTTY =
      typeof process !== "undefined" && process.stdin && process.stdin.isTTY;

    if (!isTTY || !this.opts.keyboardNavigation) {
      // Non-interactive environment
      for (let i = 0; i < this.slides.length; i++) {
        this.index = i;
        const slide = this.slides[i];
        const stages = slide.stageCount;
        if (slide.hasStages() && this.opts.nonInteractiveStages === "all") {
          for (let st = 0; st < stages; st++) {
            this.stagePerSlide[i] = st;
            await this.renderCurrent();
          }
        } else {
          // final stage only
          this.stagePerSlide[i] = Math.max(0, stages - 1);
          await this.renderCurrent();
        }
      }
      this.running = false;
      return;
    }

    // Interactive mode
    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    await this.renderCurrent();

    const onData = async (key: string) => {
      if (!this.running) return;

      // Quit on 'q' or Ctrl+C
      if (key === "q" || key === "\u0003") {
        this.cleanup(onData);
        return;
      }

      // Space or Right arrow -> next stage/slide
      if (key === " " || key === "\u001b[C") {
        const moved = await this.next();
        if (!moved) {
          if (this.opts.exitOnLastSlide) {
            this.cleanup(onData);
          } else {
            await this.renderCurrent(this.opts.theme.notice("(Last slide)"));
          }
        }
        return;
      }

      // Left arrow -> prev stage/slide
      if (key === "\u001b[D") {
        const moved = await this.prev();
        if (!moved) {
          await this.renderCurrent(this.opts.theme.notice("(First slide)"));
        }
        return;
      }
    };

    process.stdin.on("data", onData);
  }

  public clear(): void {
    process.stdout.write("\x1Bc");
  }

  private async next(): Promise<boolean> {
    const slide = this.slides[this.index];
    const curStage = this.stagePerSlide[this.index];
    const lastStage = slide.stageCount - 1;

    if (curStage < lastStage) {
      this.stagePerSlide[this.index] = curStage + 1;
      await this.renderCurrent();
      return true;
    }

    if (this.index < this.slides.length - 1) {
      this.index++;
      // Keep whatever stage it had (defaults to 0 if first time)
      await this.renderCurrent();
      return true;
    }

    // At end of last slide
    return false;
  }

  private async prev(): Promise<boolean> {
    const slide = this.slides[this.index];
    const curStage = this.stagePerSlide[this.index];

    if (curStage > 0) {
      this.stagePerSlide[this.index] = curStage - 1;
      await this.renderCurrent();
      return true;
    }

    if (this.index > 0) {
      this.index--;
      // Go to whatever stage the previous slide was last on (default 0)
      await this.renderCurrent();
      return true;
    }

    // At very beginning
    return false;
  }

  // Internal: render slide at current index + stage
  private async renderCurrent(notice?: string): Promise<void> {
    const totalSlides = this.slides.length;
    const slide = this.slides[this.index];
    const stage = this.stagePerSlide[this.index];
    const totalStages = slide.stageCount;

    if (this.opts.clearOnRender) this.clear();

    let title: string | null = null;
    // Presentation title (if provided)
    if (this.opts.title) {
      title = this.opts.theme.header(`${this.opts.title}`);
    }

    // Slide indicator + Stage indicator
    if (this.opts.showSlideIndicator) {
      const slidePart = `[Slide ${this.index + 1}/${totalSlides}]`;
      const stagePart =
        this.opts.showStageIndicator && totalStages > 1
          ? ` • [Step ${stage + 1}/${totalStages}]`
          : "";
      process.stdout.write(
        `${this.opts.theme.slideIndicator(`${slidePart}${stagePart}`)}${
          title ? ` : ${title}` : ""
        }\n\n`
      );
    }

    // Optional header (slide overrides default)
    const resolvedHeader = slide.header ?? this.opts.header;
    if (resolvedHeader) {
      process.stdout.write(`${this.opts.theme.header(resolvedHeader)}\n\n`);
    }

    // Slide title
    process.stdout.write(`${this.opts.theme.title(slide.title)}\n\n`);

    // Body (always printed by TypeView).
    const body = await slide.renderStage(stage);
    if (body && body.length > 0) {
      process.stdout.write(`${this.opts.theme.body(body)}\n`);
    }

    // Optional footer (slide overrides default)
    const resolvedFooter = slide.footer ?? this.opts.footer;
    if (resolvedFooter) {
      process.stdout.write(`\n${this.opts.theme.footer(resolvedFooter)}\n`);
    }

    if (notice) {
      process.stdout.write(`\n${notice}\n`);
    }

    // Controls
    if (this.opts.showControls) {
      process.stdout.write(
        `\n${this.opts.theme.controls(
          "Controls: ← Back | → Next | Space Next | q Quit"
        )}\n`
      );
    }
  }

  private cleanup(onData: (key: string) => void): void {
    this.running = false;
    process.stdin.setRawMode?.(false);
    process.stdin.pause();
    process.stdin.removeListener("data", onData);
    process.stdout.write(
      `${this.opts.theme.footer("Exiting presentation.")}\n`
    );
  }
}
