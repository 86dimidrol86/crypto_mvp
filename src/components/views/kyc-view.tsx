'use client'

import { useState } from 'react'
import {
  ShieldCheck,
  Phone,
  FileText,
  Camera,
  Fingerprint,
  GraduationCap,
  CheckCircle2,
  Loader2,
  Upload,
  Lock,
  Award,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  KeyRound,
  Landmark,
  AlertTriangle,
  Sparkles,
  ScanFace,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { useI18n } from '@/lib/use-i18n'
import { useMounted } from '@/lib/use-mounted'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { StepSkeleton } from '@/components/page-skeleton'

const STEPS = [
  { id: 0, titleKey: 'kyc.step.phone', icon: Phone, descKey: 'kyc.step.phoneDesc' },
  { id: 1, titleKey: 'kyc.step.document', icon: FileText, descKey: 'kyc.step.documentDesc' },
  { id: 2, titleKey: 'kyc.step.selfie', icon: Camera, descKey: 'kyc.step.selfieDesc' },
  { id: 3, titleKey: 'kyc.step.address', icon: Fingerprint, descKey: 'kyc.step.addressDesc' },
  { id: 4, titleKey: 'kyc.step.qualification', icon: GraduationCap, descKey: 'kyc.step.qualificationDesc' },
] as const

const DOC_TYPES = [
  { value: 'passport_rf', labelKey: 'kyc.doc.passportRf' },
  { value: 'foreign_passport', labelKey: 'kyc.doc.foreignPassport' },
  { value: 'driver_license', labelKey: 'kyc.doc.driverLicense' },
]

function generateAid(): string {
  const part = () =>
    Array.from({ length: 4 }, () =>
      'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
    ).join('')
  return `RU-AID-${part()}-${part()}`
}

function PhoneStep({ done, onNext }: { done: boolean; onNext: () => void }) {
  const { t } = useI18n()
  const [phone, setPhone] = useState('+7 ')
  const [codeSent, setCodeSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)

  const sendCode = () => {
    if (phone.replace(/\D/g, '').length < 11) {
      toast.error(t('kyc.toast.phoneInvalid'))
      return
    }
    setSending(true)
    setTimeout(() => {
      setSending(false)
      setCodeSent(true)
      toast.success(t('kyc.toast.smsSent'), { description: t('kyc.toast.smsDemo') })
    }, 900)
  }

  const verify = () => {
    if (otp.length < 4) {
      toast.error(t('kyc.toast.codeInvalid'))
      return
    }
    setVerifying(true)
    setTimeout(() => {
      setVerifying(false)
      toast.success(t('kyc.toast.phoneConfirmed'))
      onNext()
    }, 800)
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 text-sm text-success">
        <CheckCircle2 className="w-4 h-4" />
        {t('kyc.phone.confirmed')} {phone}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t('kyc.phone.label')}</Label>
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="bg-input/40 font-mono h-10"
          placeholder="+7 (___) ___-__-__"
        />
      </div>
      {!codeSent ? (
        <Button
          onClick={sendCode}
          disabled={sending}
          variant="outline"
          className="w-full h-10 gap-2"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
          {t('kyc.phone.sendCode')}
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('kyc.phone.codeLabel')}</Label>
            <Input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              className="bg-input/40 font-mono tracking-[0.5em] text-center h-10 text-base"
              placeholder="••••"
            />
            <p className="text-[10px] text-muted-foreground">{t('kyc.phone.demoCode')}</p>
          </div>
          <Button
            onClick={verify}
            disabled={verifying}
            className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
          >
            {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            {t('kyc.phone.confirm')}
          </Button>
        </div>
      )}
    </div>
  )
}

function DocumentStep({ done, onNext }: { done: boolean; onNext: () => void }) {
  const { t } = useI18n()
  const [docType, setDocType] = useState('passport_rf')
  const [uploaded, setUploaded] = useState(false)
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'processing' | 'done'>('idle')

  const upload = () => {
    setUploaded(true)
    setOcrStatus('processing')
    setTimeout(() => {
      setOcrStatus('done')
      toast.success(t('kyc.doc.toast.ocrDone'), { description: t('kyc.doc.toast.ocrDesc') })
    }, 1800)
  }

  if (done) {
    const docLabel = DOC_TYPES.find((d) => d.value === docType)
    return (
      <div className="flex items-center gap-2 text-sm text-success">
        <CheckCircle2 className="w-4 h-4" />
        {t('kyc.doc.confirmed')} {docLabel ? t(docLabel.labelKey) : docType}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t('kyc.doc.typeLabel')}</Label>
        <Select value={docType} onValueChange={setDocType}>
          <SelectTrigger className="w-full h-10 bg-input/40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOC_TYPES.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {t(d.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!uploaded ? (
        <button
          onClick={upload}
          className="w-full border-2 border-dashed border-border rounded-xl py-6 flex flex-col items-center justify-center gap-2 hover:border-primary/40 hover:bg-primary/5 transition group"
        >
          <div className="w-10 h-10 rounded-2xl bg-muted/40 group-hover:bg-primary/10 flex items-center justify-center transition">
            <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
          </div>
          <div className="text-sm font-medium">{t('kyc.doc.uploadTitle')}</div>
          <div className="text-[11px] text-muted-foreground">{t('kyc.doc.uploadHint')}</div>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-muted/20">
            <div className="w-14 h-9 rounded bg-gradient-to-br from-primary/30 to-primary/5 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{docType}_front.jpg</div>
              <div className="text-[10px] text-muted-foreground">{t('kyc.doc.uploadedSize')}</div>
            </div>
            <CheckCircle2 className="w-4 h-4 text-success" />
          </div>
          <div className="flex items-center gap-2 text-xs">
            {ocrStatus === 'processing' && (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span className="text-muted-foreground">{t('kyc.doc.ocrProgress')}</span>
              </>
            )}
            {ocrStatus === 'done' && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                <span className="text-success">{t('kyc.doc.ocrDone')}</span>
              </>
            )}
          </div>
          {ocrStatus === 'done' && (
            <Button
              onClick={onNext}
              className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {t('kyc.doc.continue')}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function SelfieStep({ done, onNext }: { done: boolean; onNext: () => void }) {
  const { t } = useI18n()
  const [stage, setStage] = useState<'idle' | 'scanning' | 'done'>('idle')
  const [progress, setProgress] = useState(0)

  const start = () => {
    setStage('scanning')
    setProgress(0)
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval)
          setStage('done')
          toast.success(t('kyc.selfie.toast.passed'))
          return 100
        }
        return p + 10
      })
    }, 280)
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 text-sm text-success">
        <CheckCircle2 className="w-4 h-4" />
        {t('kyc.selfie.passed')}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0">
          {stage === 'scanning' ? (
            <ScanFace className="w-9 h-9 text-primary animate-pulse" />
          ) : stage === 'done' ? (
            <CheckCircle2 className="w-9 h-9 text-success" />
          ) : (
            <Camera className="w-9 h-9 text-muted-foreground" />
          )}
        </div>
        <div className="text-sm">
          <div className="font-medium">{t('kyc.selfie.title')}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {t('kyc.selfie.desc')}
          </div>
        </div>
      </div>

      {stage === 'scanning' && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="text-xs text-muted-foreground text-center font-mono">
            {t('kyc.selfie.analyzing')} {progress}%
          </div>
        </div>
      )}

      {stage !== 'scanning' && (
        <Button
          onClick={start}
          disabled={stage === 'done'}
          className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
        >
          {stage === 'done' ? (
            <>
              <CheckCircle2 className="w-4 h-4" /> {t('kyc.selfie.passedTitle')}
            </>
          ) : (
            <>
              <ScanFace className="w-4 h-4" /> {t('kyc.selfie.startBtn')}
            </>
          )}
        </Button>
      )}

      {stage === 'done' && (
        <Button
          onClick={onNext}
          variant="outline"
          className="w-full h-10 gap-2"
        >
          {t('kyc.selfie.continue')}
          <ChevronRight className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}

function AddressBindingStep({ done, onNext }: { done: boolean; onNext: () => void }) {
  const { t } = useI18n()
  const [agreed, setAgreed] = useState(false)

  if (done) {
    return (
      <div className="flex items-center gap-2 text-sm text-success">
        <CheckCircle2 className="w-4 h-4" />
        {t('kyc.address.consent')}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Fingerprint className="w-4 h-4" />
          {t('kyc.address.title')}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t('kyc.address.desc')}
        </p>
      </div>

      <div className="space-y-2 text-xs text-muted-foreground">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />
          <span>{t('kyc.address.b1')}</span>
        </div>
        <div className="flex items-start gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />
          <span>{t('kyc.address.b2')}</span>
        </div>
        <div className="flex items-start gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />
          <span>{t('kyc.address.b3')}</span>
        </div>
      </div>

      <label className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/20 cursor-pointer hover:border-primary/30 transition">
        <Checkbox
          checked={agreed}
          onCheckedChange={(v) => setAgreed(v === true)}
          className="mt-0.5"
        />
        <span className="text-xs leading-relaxed">
          {t('kyc.address.consentLabel')}
        </span>
      </label>

      <Button
        onClick={onNext}
        disabled={!agreed}
        className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
      >
        <Lock className="w-4 h-4" />
        {t('kyc.address.accept')}
      </Button>
    </div>
  )
}

function QualificationStep({ onDone }: { onDone: () => void }) {
  const { t } = useI18n()
  const [path, setPath] = useState<'none' | 'test' | 'assets'>('none')
  const [testOpen, setTestOpen] = useState(false)
  const [testProgress, setTestProgress] = useState(0)
  const [assetsVerifying, setAssetsVerifying] = useState(false)

  const startTest = () => {
    setPath('test')
    setTestOpen(true)
    setTestProgress(0)
    const interval = setInterval(() => {
      setTestProgress((p) => {
        if (p >= 25) {
          clearInterval(interval)
          setTestOpen(false)
          toast.success(t('kyc.qualification.toast.testPassed'), {
            description: t('kyc.qualification.toast.testDesc'),
          })
          setTimeout(onDone, 400)
          return 25
        }
        return p + 1
      })
    }, 220)
  }

  const verifyAssets = () => {
    setPath('assets')
    setAssetsVerifying(true)
    setTimeout(() => {
      setAssetsVerifying(false)
      toast.success(t('kyc.qualification.toast.assetsConfirmed'), {
        description: t('kyc.qualification.toast.assetsDesc'),
      })
      setTimeout(onDone, 400)
    }, 1800)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 space-y-1.5">
        <div className="flex items-center gap-2 text-sm font-medium text-warning">
          <AlertTriangle className="w-4 h-4" />
          {t('kyc.qualification.title')}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t('kyc.qualification.desc')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <button
          onClick={startTest}
          disabled={path !== 'none' && path !== 'test'}
          className={cn(
            'flex items-start gap-3 p-3 rounded-xl border text-left transition group',
            path === 'test'
              ? 'border-primary/40 bg-primary/5'
              : 'border-border bg-muted/20 hover:border-primary/30'
          )}
        >
          <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{t('kyc.qualification.testTitle')}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {t('kyc.qualification.testDesc')}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary mt-1" />
        </button>

        <button
          onClick={verifyAssets}
          disabled={(path !== 'none' && path !== 'assets') || assetsVerifying}
          className={cn(
            'flex items-start gap-3 p-3 rounded-xl border text-left transition group',
            path === 'assets'
              ? 'border-primary/40 bg-primary/5'
              : 'border-border bg-muted/20 hover:border-primary/30'
          )}
        >
          <div className="w-9 h-9 rounded-xl bg-success/15 text-success flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{t('kyc.qualification.assetsTitle')}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {t('kyc.qualification.assetsDesc')}
            </div>
          </div>
          {assetsVerifying ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary mt-1" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary mt-1" />
          )}
        </button>
      </div>

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-primary" />
              {t('kyc.qualification.testHeader')}
            </DialogTitle>
            <DialogDescription>
              {t('kyc.qualification.testSub')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Progress value={(testProgress / 25) * 100} className="h-2" />
            <div className="text-xs text-muted-foreground text-center font-mono">
              {t('kyc.qualification.question')} {testProgress} {t('kyc.qualification.of')} 25
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTestOpen(false)}
              className="h-9"
            >
              {t('common.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function VerifiedCard() {
  const { t } = useI18n()
  const setKyc = useAppStore((s) => s.setKyc)
  const [aid] = useState(() => generateAid())

  const reVerify = () => {
    setKyc(0, 'UNINITIATED')
    toast.info(t('kyc.reverify.toast'))
  }

  return (
    <Card className="bg-gradient-to-br from-success/10 via-card to-card border-success/30">
      <CardContent className="p-5">
        <div className="flex flex-col items-center text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-success/15 text-success flex items-center justify-center mb-4 ring-8 ring-success/5">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <Badge variant="outline" className="border-success/40 text-success mb-2.5 gap-1.5">
            <Sparkles className="w-3 h-3" />
            {t('kyc.done.badge')}
          </Badge>
          <h2 className="text-xl font-bold">{t('kyc.done.title')}</h2>
          <p className="text-xs text-muted-foreground mt-1.5">
            {t('kyc.done.desc')}
          </p>

          <div className="w-full grid grid-cols-2 gap-2.5 mt-4">
            <div className="p-2.5 rounded-xl border border-border bg-muted/30">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {t('kyc.done.kycLevel')}
              </div>
              <div className="text-base font-bold text-success mt-0.5">Lv. 2</div>
            </div>
            <div className="p-2.5 rounded-xl border border-border bg-muted/30">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {t('kyc.done.addressId')}
              </div>
              <div className="text-xs font-mono font-bold mt-0.5 break-all">{aid}</div>
            </div>
          </div>

          <div className="w-full flex flex-wrap justify-center gap-2 mt-4">
            <Badge variant="outline" className="text-[10px] border-border">
              <CheckCircle2 className="w-3 h-3 text-success mr-1" /> {t('kyc.done.phoneOk')}
            </Badge>
            <Badge variant="outline" className="text-[10px] border-border">
              <CheckCircle2 className="w-3 h-3 text-success mr-1" /> {t('kyc.done.passportOk')}
            </Badge>
            <Badge variant="outline" className="text-[10px] border-border">
              <CheckCircle2 className="w-3 h-3 text-success mr-1" /> Liveness
            </Badge>
            <Badge variant="outline" className="text-[10px] border-border">
              <CheckCircle2 className="w-3 h-3 text-success mr-1" /> {t('kyc.done.qualificationOk')}
            </Badge>
          </div>

          <Button
            variant="outline"
            onClick={reVerify}
            className="mt-4 gap-2 h-10"
          >
            <RefreshCw className="w-4 h-4" />
            {t('kyc.done.reverify')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function EsiaButton({ onFastTrack }: { onFastTrack: () => void }) {
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)

  const handleClick = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      onFastTrack()
    }, 1200)
  }

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      disabled={loading}
      className="gap-2 h-10 border-primary/30 hover:bg-primary/5 hover:text-primary"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Landmark className="w-4 h-4 text-primary" />
      )}
      {t('kyc.gosuslugi.btn')}
    </Button>
  )
}

function ComplianceBadges() {
  const { t } = useI18n()
  return (
    <Card className="bg-card/40">
      <CardContent className="p-3.5">
        <div className="flex items-center gap-2 mb-2.5">
          <ShieldCheck className="w-4 h-4 text-success" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('kyc.gosuslugi.lawTitle')}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-[10px] border-border gap-1">
            <FileText className="w-3 h-3" /> {t('kyc.gosuslugi.law1')}
          </Badge>
          <Badge variant="outline" className="text-[10px] border-border gap-1">
            <FileText className="w-3 h-3" /> {t('kyc.gosuslugi.law2')}
          </Badge>
          <Badge variant="outline" className="text-[10px] border-border gap-1">
            <FileText className="w-3 h-3" /> {t('kyc.gosuslugi.law3')}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

export function KycView() {
  const { t } = useI18n()
  const kycLevel = useAppStore((s) => s.kycLevel)
  const kycStatus = useAppStore((s) => s.kycStatus)
  const setKyc = useAppStore((s) => s.setKyc)
  const pushNotification = useAppStore((s) => s.pushNotification)

  const [step, setStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const mounted = useMounted()

  const isVerified = kycLevel >= 2

  const markStepDone = (s: number) => {
    setCompletedSteps((prev) => new Set(prev).add(s))
    if (s < STEPS.length - 1) {
      setStep(s + 1)
    }
  }

  const handleEsia = () => {
    toast.success(t('kyc.gosuslugi.toast.dataReceived'), {
      description: t('kyc.gosuslugi.toast.dataDesc'),
    })
    setCompletedSteps(new Set([0, 1, 2]))
    setStep(3)
    setKyc(1, 'PHONE_VERIFIED')
  }

  const handleQualificationDone = () => {
    setKyc(2, 'ACTIVE')
    pushNotification(
      t('kyc.gosuslugi.toast.doneTitle'),
      t('kyc.gosuslugi.toast.doneDesc')
    )
    toast.success(t('kyc.gosuslugi.toast.successTitle'), {
      description: t('kyc.gosuslugi.toast.successDesc'),
    })
  }

  if (isVerified) {
    return (
      <div className="flex-1 py-4">
        <div className="max-w-[1400px] mx-auto px-3 lg:px-5 space-y-4">
          <header>
            <Badge variant="outline" className="border-success/40 text-success mb-1.5 gap-1.5">
              <ShieldCheck className="w-3 h-3" />
              KYC LEVEL 2
            </Badge>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight">{t('kyc.header.title')}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {t('kyc.header.statusVerified')} {kycStatus}
            </p>
          </header>
          <VerifiedCard />
          <ComplianceBadges />
        </div>
      </div>
    )
  }

  const progressPct = ((step + (completedSteps.has(step) ? 1 : 0)) / STEPS.length) * 100

  return (
    <div className="flex-1 py-4">
      <div className="max-w-[1400px] mx-auto px-3 lg:px-5 space-y-4">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="outline" className="border-primary/30 text-primary gap-1.5">
                <ShieldCheck className="w-3 h-3" />
                KYC / AML
              </Badge>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                {t('kyc.header.level')} {kycLevel}
              </Badge>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight">{t('kyc.header.title')}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {t('kyc.header.subtitleGuest')}
            </p>
          </div>
          <EsiaButton onFastTrack={handleEsia} />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-4">
          {/* Stepper sidebar */}
          <Card className="bg-card/60 backdrop-blur h-fit lg:sticky lg:top-20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-primary" />
                {t('kyc.progress')}
              </CardTitle>
              <CardDescription className="text-xs">
                {t('kyc.stepWord')} {Math.min(step + 1, STEPS.length)} {t('kyc.of')} {STEPS.length}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progressPct} className="h-2" />
              <ol className="space-y-1">
                {STEPS.map((s, i) => {
                  const completed = completedSteps.has(i) || i < step
                  const active = i === step
                  const Icon = s.icon
                  return (
                    <li
                      key={s.id}
                      className={cn(
                        'flex items-center gap-3 p-2.5 rounded-lg transition',
                        active && 'bg-primary/10 border border-primary/30',
                        !active && 'border border-transparent'
                      )}
                    >
                      <div
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                          completed && 'bg-success/15 text-success',
                          active && !completed && 'bg-primary/15 text-primary',
                          !active && !completed && 'bg-muted/40 text-muted-foreground'
                        )}
                      >
                        {completed ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div
                          className={cn(
                            'text-sm font-medium',
                            active && 'text-primary',
                            completed && 'text-foreground'
                          )}
                        >
                          {t(s.titleKey)}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {t(s.descKey)}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </CardContent>
          </Card>

          {/* Step content */}
          <div className="space-y-4">
            {!mounted ? (
              <StepSkeleton />
            ) : (
              STEPS.map((s, i) => {
                if (i !== step) return null
                const Icon = s.icon
                const completed = completedSteps.has(i)
                return (
                  <Card key={s.id} className="bg-card/60 backdrop-blur">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              {t('kyc.stepTitle')} {i + 1}. {t(s.titleKey)}
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">{t(s.descKey)}</CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {i + 1} / {STEPS.length}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {i === 0 && (
                        <PhoneStep done={completed} onNext={() => markStepDone(0)} />
                      )}
                      {i === 1 && (
                        <DocumentStep done={completed} onNext={() => markStepDone(1)} />
                      )}
                      {i === 2 && (
                        <SelfieStep done={completed} onNext={() => markStepDone(2)} />
                      )}
                      {i === 3 && (
                        <AddressBindingStep done={completed} onNext={() => markStepDone(3)} />
                      )}
                      {i === 4 && <QualificationStep onDone={handleQualificationDone} />}

                      {i < STEPS.length - 1 && completed && (
                        <div className="mt-3 pt-3 border-t border-border flex justify-end">
                          <Button
                            onClick={() => setStep(i + 1)}
                            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            {t('kyc.next')}
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                      {i > 0 && !completed && (
                        <div className="mt-3 pt-3 border-t border-border flex justify-between">
                          <Button
                            variant="ghost"
                            onClick={() => setStep(i - 1)}
                            className="gap-1 text-muted-foreground"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            {t('kyc.back')}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}

            <ComplianceBadges />
          </div>
        </div>
      </div>
    </div>
  )
}
