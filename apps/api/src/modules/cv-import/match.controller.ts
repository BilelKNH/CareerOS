import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CvMatchService } from './cv-match.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('match')
export class MatchController {
  constructor(private readonly match: CvMatchService) {}

  /** Score the profile against a catalog of métiers across sectors. */
  @Get('careers')
  careers(@CurrentUser('userId') userId: string) {
    return this.match.exploreCareers(userId);
  }

  /** Score the candidate against the market demand for a role. */
  @Post('role')
  byRole(
    @CurrentUser('userId') userId: string,
    @Body() body: { role: string; cvText?: string },
  ) {
    return this.match.scoreByRole(userId, body.role, body.cvText);
  }

  /** Score the CV/profile against a specific offer or a pasted job ad. */
  @Post('offer')
  byOffer(
    @CurrentUser('userId') userId: string,
    @Body() body: { offerId?: string; jobText?: string; cvText?: string },
  ) {
    return this.match.matchOffer(userId, body);
  }

  /** Analyse a job posting straight from its URL (server fetches the page). */
  @Post('offer-url')
  byOfferUrl(@CurrentUser('userId') userId: string, @Body() body: { url: string }) {
    return this.match.matchOfferFromUrl(userId, body.url);
  }
}
