import { expect } from '@playwright/test';
import { test } from '@utils/test/playwright';

test.describe('select: basic', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/components/select/test/legacy/basic');
  });

  test('should not open multiple alert windows when clicked multiple times', async ({ page }) => {
    test.info().annotations.push({
      type: 'issue',
      description: 'https://github.com/ionic-team/ionic-framework/issues/25126',
    });

    const select = page.locator('#gender');

    await select.evaluate((el: HTMLSelectElement) => {
      /*
       * Playwright's click() method attempts to scroll to the handle
       * to perform the action. That is problematic when the overlay
       * is already visible. We manually click() the element instead
       * to avoid flaky tests.
       */
      el.click();
      el.click();
      el.click();
    });

    const alerts = await page.$$('ion-alert');

    expect(alerts.length).toBe(1);
  });

  test.describe('select: alert', () => {
    test('it should open an alert select', async ({ page }) => {
      const ionAlertDidPresent = await page.spyOnEvent('ionAlertDidPresent');
      const ionDismiss = await page.spyOnEvent('ionDismiss');

      await page.click('#customAlertSelect');

      await ionAlertDidPresent.next();

      expect(await page.screenshot({ animations: 'disabled' })).toMatchSnapshot(
        `select-alert-diff-${page.getSnapshotSettings()}.png`
      );

      const alert = await page.locator('ion-alert');
      await alert.evaluate((el: HTMLIonAlertElement) => el.dismiss());

      await ionDismiss.next();
    });
  });

  test.describe('select: action sheet', () => {
    test('it should open an action sheet select', async ({ page }) => {
      const ionActionSheetDidPresent = await page.spyOnEvent('ionActionSheetDidPresent');
      const ionDismiss = await page.spyOnEvent('ionDismiss');

      await page.click('#customActionSheetSelect');

      await ionActionSheetDidPresent.next();

      expect(await page.screenshot({ animations: 'disabled' })).toMatchSnapshot(
        `select-action-sheet-diff-${page.getSnapshotSettings()}.png`
      );

      const actionSheet = await page.locator('ion-action-sheet');
      await actionSheet.evaluate((el: HTMLIonActionSheetElement) => el.dismiss());

      await ionDismiss.next();
    });
  });

  test.describe('select: popover', () => {
    test('it should open a popover select', async ({ page, browserName, skip }) => {
      // TODO (FW-2979)
      skip.browser('webkit', 'Safari 16 only allows text fields and pop-up menus to be focused.');

      const ionPopoverDidPresent = await page.spyOnEvent('ionPopoverDidPresent');
      const ionDismiss = await page.spyOnEvent('ionDismiss');

      await page.click('#customPopoverSelect');

      await ionPopoverDidPresent.next();

      const popover = page.locator('ion-popover');

      // TODO(FW-1436)
      if (browserName !== 'firefox') {
        // select has no value, so first option should be focused by default
        const popoverOption1 = await popover.locator('.select-interface-option:first-of-type ion-radio');
        await expect(popoverOption1).toBeFocused();
      }

      expect(await page.screenshot({ animations: 'disabled' })).toMatchSnapshot(
        `select-popover-diff-${page.getSnapshotSettings()}.png`
      );

      await popover.evaluate((el: HTMLIonPopoverElement) => el.dismiss());

      await ionDismiss.next();
    });
  });
});

test.describe('select: ionChange', () => {
  test.beforeEach(({ skip }) => {
    skip.rtl();
    skip.mode('ios', 'ionChange has a consistent behavior across modes');
  });

  test('should fire ionChange when confirming a value from an alert', async ({ page }) => {
    await page.setContent(`
      <ion-select interface="alert">
        <ion-select-option value="apple">Apple</ion-select-option>
        <ion-select-option value="banana">Banana</ion-select-option>
      </ion-select>
    `);

    const ionAlertDidPresent = await page.spyOnEvent('ionAlertDidPresent');
    const ionChange = await page.spyOnEvent('ionChange');
    const select = page.locator('ion-select');

    await select.click();
    await ionAlertDidPresent.next();

    const alert = page.locator('ion-alert');
    const radioButtons = alert.locator('.alert-radio-button');
    const confirmButton = alert.locator('.alert-button:not(.alert-button-role-cancel)');

    await radioButtons.nth(0).click();
    await confirmButton.click();

    await ionChange.next();
    expect(ionChange).toHaveReceivedEventDetail({ value: 'apple' });
  });

  test('should fire ionChange when confirming a value from a popover', async ({ page }) => {
    await page.setContent(`
      <ion-select interface="popover">
        <ion-select-option value="apple">Apple</ion-select-option>
        <ion-select-option value="banana">Banana</ion-select-option>
      </ion-select>
    `);

    const ionPopoverDidPresent = await page.spyOnEvent('ionPopoverDidPresent');
    const ionChange = await page.spyOnEvent('ionChange');
    const select = page.locator('ion-select');

    await select.click();
    await ionPopoverDidPresent.next();

    const popover = page.locator('ion-popover');
    const radioButtons = popover.locator('ion-radio');

    await radioButtons.nth(0).click();

    await ionChange.next();
    expect(ionChange).toHaveReceivedEventDetail({ value: 'apple', event: { isTrusted: true } });
  });

  test('should fire ionChange when confirming a value from an action sheet', async ({ page }) => {
    await page.setContent(`
      <ion-select interface="action-sheet">
        <ion-select-option value="apple">Apple</ion-select-option>
        <ion-select-option value="banana">Banana</ion-select-option>
      </ion-select>
    `);

    const ionActionSheetDidPresent = await page.spyOnEvent('ionActionSheetDidPresent');
    const ionChange = await page.spyOnEvent('ionChange');
    const select = page.locator('ion-select');

    await select.click();
    await ionActionSheetDidPresent.next();

    const actionSheet = page.locator('ion-action-sheet');
    const buttons = actionSheet.locator('.action-sheet-button');

    await buttons.nth(0).click();

    await ionChange.next();
    expect(ionChange).toHaveReceivedEventDetail({ value: 'apple' });
  });

  test('should not fire when programmatically setting a valid value', async ({ page }) => {
    await page.setContent(`
      <ion-select>
        <ion-select-option value="apple">Apple</ion-select-option>
        <ion-select-option value="banana">Banana</ion-select-option>
      </ion-select>
    `);

    const ionChange = await page.spyOnEvent('ionChange');
    const select = page.locator('ion-select');

    await select.evaluate((el: HTMLIonSelectElement) => (el.value = 'banana'));
    await expect(ionChange).not.toHaveReceivedEvent();
  });
});
