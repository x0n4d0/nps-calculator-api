import { Request, Response } from 'express';
import { getCustomRepository } from 'typeorm';
import { resolve } from 'path';

import { SurveyRepository } from '@/repositories/survey';
import { SurveyUserRepository } from '@/repositories/survey-user';
import { UserRepository } from '@/repositories/user';
import SendMailService from '@/services/send-mail';

export class SendMailController {
  async execute(request: Request, response: Response): Promise<Response> {
    const { email, survey_id } = request.body;

    const userRepository = getCustomRepository(UserRepository);
    const surveyRepository = getCustomRepository(SurveyRepository);
    const surveyUserRepository = getCustomRepository(SurveyUserRepository);

    const user = await userRepository.findOne({ email });

    if (!user) {
      return response.status(400).json({
        error: 'User does not exist!',
      });
    }

    const survey = await surveyRepository.findOne({
      id: survey_id,
    });

    if (!survey) {
      return response.status(400).json({
        error: 'Survey does not exist!',
      });
    }

    const variables = {
      name: user.name,
      title: survey.title,
      description: survey.description,
      user_id: user.id,
      link: process.env.URL_MAIL,
    };

    const npsPath = resolve(__dirname, '..', 'views', 'emails', 'nps-mail.hbs');

    const isSurveyUserAlreadyExists = await surveyUserRepository.findOne({
      where: [{ user_id: user.id }, { value: null }],
    });

    if (isSurveyUserAlreadyExists) {
      await SendMailService.execute(email, survey.title, variables, npsPath);
      return response.json(isSurveyUserAlreadyExists);
    }

    const surveyUser = surveyUserRepository.create({
      user_id: user.id,
      survey_id,
    });

    await surveyUserRepository.save(surveyUser);

    await SendMailService.execute(email, survey.title, variables, npsPath);

    return response.json(surveyUser);
  }
}
