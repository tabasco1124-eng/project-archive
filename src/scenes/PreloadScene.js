/* PreloadScene: 에셋 매니페스트(스프라이트) 로드 → 플레이스홀더 텍스처 생성 → 애니메이션 등록 */
window.RD = window.RD || {};

RD.PreloadScene = class PreloadScene extends Phaser.Scene {
  constructor() { super('PreloadScene'); }

  preload() {
    const W = RD.W, H = RD.H;
    const bar = this.add.graphics();
    const label = this.add.text(W / 2, H / 2 - 80, '아카이브 데이터 동기화 중...', RD.util.textStyle(40, '#00e5ff')).setOrigin(0.5)
      .setShadow(0, 0, '#00e5ff', 16, false, true);
    this.load.on('progress', v => {     // 타이틀과 같은 네온 스타일 진행 바
      bar.clear(); bar.fillStyle(0x0b0f24, 1).fillRect(180, H / 2, 720, 32);
      bar.fillStyle(0x00e5ff, 1).fillRect(180, H / 2, 720 * v, 32);
      bar.lineStyle(10, 0xff2bd6, 0.15).strokeRect(176, H / 2 - 4, 728, 40);
      bar.lineStyle(3, 0xff2bd6, 1).strokeRect(180, H / 2, 720, 32);
    });
    this.failed = [];
    this.load.on('loaderror', file => { this.failed.push(file.key); });

    const groups = [['units', 'spr_unit_'], ['enemies', 'spr_enemy_']], queued = new Set();
    for (const [group, prefix] of groups) {
      const list = (RD.ASSETS && RD.ASSETS[group]) || {};
      for (const id in list) {
        const a = list[id], url = RD.assetUrl(a.url), key = RD.assetKey(prefix, id, a);
        if (queued.has(key)) continue;
        queued.add(key);
        // file:// 로 열면 브라우저가 이미지 요청을 막으므로 시도하지 않고 플레이스홀더 사용 (dataURL 은 가능)
        if (location.protocol === 'file:' && !/^data:/.test(url)) { this.failed.push(key); continue; }
        if (a.type === 'spritesheet') this.load.spritesheet(key, url, { frameWidth: a.frameWidth, frameHeight: a.frameHeight });
        else this.load.image(key, url);
      }
    }
    this.events.once('shutdown', () => label.destroy());
  }

  create() {
    if (this.failed.length) {
      console.warn('[RD] 스프라이트를 불러오지 못해 플레이스홀더를 사용합니다: ' + this.failed.join(', ') +
        (location.protocol === 'file:' ? '  (file:// 에서는 이미지 로딩이 막힙니다. 로컬 서버로 실행하거나 node tools/build.js 로 dist 를 다시 만드세요)' : ''));
    }
    RD.Textures.generateAll(this);
    // 스프라이트시트 애니메이션 등록: 키 = spr_unit_<id>_<anim> / spr_enemy_<id>_<anim>
    const groups = [['units', 'spr_unit_'], ['enemies', 'spr_enemy_']];
    for (const [group, prefix] of groups) {
      const list = (RD.ASSETS && RD.ASSETS[group]) || {};
      for (const id in list) {
        const a = list[id], key = RD.assetKey(prefix, id, a);
        // 픽셀아트는 각지게 유지 (smooth: HD 스프라이트는 부드럽게 확대)
        if (this.textures.exists(key) && !a.smooth) this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
        if (a.type !== 'spritesheet' || !a.anims || !this.textures.exists(key)) continue;
        for (const name in a.anims) {
          const an = a.anims[name];
          if (this.anims.exists(key + '_' + name)) continue;
          this.anims.create({
            key: key + '_' + name,
            frames: this.anims.generateFrameNumbers(key, { frames: an.frames }),
            frameRate: an.frameRate || 8,
            repeat: an.repeat === undefined ? -1 : an.repeat,
          });
        }
      }
    }
    this.scene.start('TitleScene');
  }
};
