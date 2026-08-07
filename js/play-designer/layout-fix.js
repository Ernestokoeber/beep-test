export function injectPlayDesignerLayoutFix() {
  if (document.getElementById('courthub-play-designer-layout-fix')) return;

  const style = document.createElement('style');
  style.id = 'courthub-play-designer-layout-fix';
  style.textContent = `
    /* Der Play Designer darf nicht im globalen 900-px-App-Container stecken. */
    main#app:has(> .chpd) {
      max-width: none;
      width: auto;
      overflow-x: hidden;
    }

    /* Das zentrale Editor-Element ist selbst ein <main> und darf deshalb
       nicht die globalen main-Abstände und die globale Maximalbreite erben. */
    .chpd main.chpd-center {
      width: auto;
      max-width: none;
      min-width: 0;
      margin: 0;
      padding: 0;
    }

    .chpd {
      width: 100%;
      max-width: 96rem;
    }

    .chpd-grid > * {
      min-width: 0;
    }

    .chpd-stage,
    .chpd-stage-inner,
    .chpd-transport,
    .chpd-timeline,
    .chpd-court-wrap {
      min-width: 0;
      max-width: 100%;
    }

    @media (min-width: 1400px) {
      .chpd-grid {
        grid-template-columns: minmax(15rem, 17rem) minmax(34rem, 1fr) minmax(15rem, 18rem);
      }
    }

    @media (min-width: 1160px) and (max-width: 1399px) {
      .chpd-grid {
        grid-template-columns: minmax(14rem, 16rem) minmax(0, 1fr);
      }

      .chpd-inspector {
        grid-column: 1 / -1;
      }
    }
  `;
  document.head.appendChild(style);
}
