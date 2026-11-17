# Will It Run? graph demo

Loads the public [Will It Run?](https://willitrunllm.com) catalog (models, hardware, fit verdicts, measured speeds) into StreamGraph Explore.

```powershell
npm run test:willitrun
npm run demo:willitrun
npm run fixtures:willitrun   # optional: refresh explore/demos/willitrun/fixture.json (needs network)
```

`fixture.json` is committed so a fresh clone can run the tests without downloading. It is CC BY 4.0 data from Will It Run? (attribution is in the file). Refresh only when you want a newer catalog; the saved-view test P1 checks a count from this snapshot.

Then open the printed Explore URL (includes `?style=/explore/willitrun-style.json`). Click a GPU such as RTX 5060 to see which models fit (green), are tight (yellow), need RAM offload (orange), or do not fit (dim grey).

Default checker config cached in the fixture: min q4 (best quant at Q4 or better), ctx 4096, KV f16, 32 GB system RAM for discrete-GPU offload, 50 GB/s RAM bandwidth. Data from Will It Run?
