import { Component } from 'vue-property-decorator';
import { Inject } from 'services/core/injector';
import ModalLayout from 'components/ModalLayout.vue';
import ValidatedForm from 'components/shared/inputs/ValidatedForm';
import HFormGroup from 'components/shared/inputs/HFormGroup.vue';
import TsxComponent from 'components/tsx-component';
import { GlobalSelection, SelectionService } from 'services/selection';
import { $t } from 'services/i18n';
import { NumberInput } from 'components/shared/inputs/inputs';
import { WindowsService } from 'services/windows';
import { EditorCommandsService } from 'services/editor-commands';
import { v2 } from 'util/vec2';
import { AnchorPositions, AnchorPoint } from 'util/ScalableRectangle';

const dirMap = (dir: string) =>
  ({
    left: $t('Left'),
    right: $t('Right'),
    top: $t('Top'),
    bottom: $t('Bottom'),
  }[dir]);

@Component({})
export default class EditTransform extends TsxComponent<{}> {
  @Inject() selectionService: SelectionService;
  @Inject() windowsService: WindowsService;
  @Inject() private editorCommandsService: EditorCommandsService;

  rect: IVec2 = null;

  $mounted() {
    // We only care about the attributes of the rectandle no the functionality
    this.rect = { ...this.selection.getBoundingRect() };
  }

  $refs: {
    validForm: ValidatedForm;
  };

  get selection() {
    return this.selectionService.views.globalSelection;
  }

  get transform() {
    return this.selection.getItems()[0].transform;
  }

  async setCrop(cropEdge: keyof ICrop, value: string) {
    if (await this.$refs.validForm.validateAndGetErrorsCount()) return;

    this.editorCommandsService.actions.executeCommand('CropItemsCommand', this.selection, {
      [cropEdge]: Number(value),
    });
  }

  async setPos(dir: string, value: string) {
    if (await this.$refs.validForm.validateAndGetErrorsCount()) return;
    const delta = Number(value) - Math.round(this.rect[dir]);

    this.editorCommandsService.actions.executeCommand('MoveItemsCommand', this.selection, {
      [dir]: delta,
    });

    this.rect[dir] += delta;
  }

  async setScale(dir: string, value: string) {
    if (await this.$refs.validForm.validateAndGetErrorsCount()) return;
    if (Number(value) === this.rect[dir]) return;
    const scale = Number(value) / this.rect[dir];
    const scaleX = dir === 'width' ? scale : 1;
    const scaleY = dir === 'height' ? scale : 1;
    const scaleDelta = v2(scaleX, scaleY);

    this.editorCommandsService.actions.executeCommand(
      'ResizeItemsCommand',
      this.selection,
      scaleDelta,
      AnchorPositions[AnchorPoint.NorthWest],
    );

    this.rect[dir] = Number(value);
  }

  rotate(deg: number) {
    this.editorCommandsService.actions.executeCommand('RotateItemsCommand', this.selection, deg);
  }

  reset() {
    this.editorCommandsService.actions.executeCommand('ResetTransformCommand', this.selection);
    this.rect = this.selection.getBoundingRect();
  }

  cancel() {
    this.windowsService.closeChildWindow();
  }

  get cropForm() {
    if (!this.selection || !this.selection.isSceneItem()) return null;
    return (
      <HFormGroup metadata={{ title: $t('Crop') }}>
        {['left', 'right', 'top', 'bottom'].map((dir: keyof ICrop) => (
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <NumberInput
              value={this.transform.crop[dir]}
              metadata={{ isInteger: true, min: 0 }}
              onInput={(value: string) => this.setCrop(dir, value)}
            />
            <span style="margin-left: 8px;">{dirMap(dir)}</span>
          </div>
        ))}
      </HFormGroup>
    );
  }

  coordinateInputHandler(type: string, dir: string, value: string) {
    if (type === 'pos') {
      this.setPos(dir, value);
    } else {
      this.setScale(dir, value);
    }
  }

  coordinateForm(type: string) {
    const title = type === 'pos' ? $t('Position') : $t('Size');
    const dataArray = type === 'pos' ? ['x', 'y'] : ['width', 'height'];
    if (!this.rect) return null;
    if (dataArray.some(dir => isNaN(Math.round(this.rect[dir])))) return null;
    return (
      <HFormGroup metadata={{ title }}>
        <div style="display: flex;">
          {dataArray.map(dir => (
            <NumberInput
              style="margin-right: 8px;"
              value={Math.round(this.rect[dir])}
              metadata={{ isInteger: true, min: type === 'pos' ? null : 1 }}
              onInput={(value: string) => this.coordinateInputHandler(type, dir, value)}
            />
          ))}
        </div>
      </HFormGroup>
    );
  }

  get rotationForm() {
    return (
      <HFormGroup metadata={{ title: $t('Rotation') }}>
        <div class="button button--default" style="width: 172px;" onClick={() => this.rotate(90)}>
          {$t('Rotate 90 Degrees CW')}
        </div>
        <div style="margin: 8px;" />
        <div class="button button--default" style="width: 172px;" onClick={() => this.rotate(-90)}>
          {$t('Rotate 90 Degrees CCW')}
        </div>
      </HFormGroup>
    );
  }

  render() {
    return (
      <ModalLayout customControls showControls={false}>
        <ValidatedForm slot="content" name="transform" ref="validForm">
          {this.coordinateForm('pos')}
          {this.coordinateForm('scale')}
          {this.rotationForm}
          {this.cropForm}
        </ValidatedForm>

        <div slot="controls">
          <button class="button button--default" onClick={() => this.reset()}>
            {$t('Reset')}
          </button>
          <button class="button button--action" onClick={() => this.cancel()}>
            {$t('Done')}
          </button>
        </div>
      </ModalLayout>
    );
  }
}
